from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from jsonschema import validate

from schemas.models import Analysis

# Minimal schema describing the master plan structure
PLAN_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "start_ms",
                    "end_ms",
                    "top_stem",
                    "gain_db",
                    "pitch_shift",
                    "stretch_ratio",
                    "x_fade",
                ],
                "properties": {
                    "start_ms": {"type": "integer", "minimum": 0},
                    "end_ms": {"type": "integer", "minimum": 0},
                    "top_stem": {"type": "string", "enum": ["a", "b"]},
                    "gain_db": {
                        "type": "object",
                        "patternProperties": {
                            "^(a|b)$": {"type": "number"}
                        },
                        "additionalProperties": False,
                    },
                    "eq": {"type": "object"},
                    "sidechain": {"type": ["boolean", "object"]},
                    "x_fade": {"type": "object"},
                    "pitch_shift": {
                        "type": "object",
                        "patternProperties": {
                            "^(a|b)$": {"type": "number"}
                        },
                        "additionalProperties": False,
                    },
                    "stretch_ratio": {
                        "type": "object",
                        "patternProperties": {
                            "^(a|b)$": {"type": "number", "minimum": 0}
                        },
                        "additionalProperties": False,
                    },
                },
            },
        }
    },
    "required": ["sections"],
}

PROMPT_PATH = Path(__file__).resolve().parent.parent / "prompts" / "masterplan.system.md"


def _duration_ms(analysis: Analysis) -> int:
    if analysis.sections:
        return max(s.end_ms for s in analysis.sections)
    if analysis.beatgrid:
        return int(analysis.beatgrid[-1])
    return 0


def _validate(plan: Dict[str, Any], dur_a: int, dur_b: int) -> None:
    """Validate plan against schema and timing constraints."""
    validate(instance=plan, schema=PLAN_SCHEMA)
    max_dur = min(dur_a, dur_b)
    for sec in plan["sections"]:
        if not (0 <= sec["start_ms"] < sec["end_ms"] <= max_dur):
            raise ValueError("section times out of range")
        if sec["top_stem"] not in {"a", "b"}:
            raise ValueError("undefined stem")
        for stem in sec["gain_db"].keys():
            if stem not in {"a", "b"}:
                raise ValueError("gain refers to undefined stem")


def generate_masterplan(analysis_a: Analysis, analysis_b: Analysis) -> Dict[str, Any]:
    """Generate a deterministic mash plan for two tracks.

    This implementation does not rely on an external LLM so that tests can
    execute offline. It constructs a minimal plan that keeps the shorter track
    on top for its full duration while ducking the other track slightly.
    """
    dur_a = _duration_ms(analysis_a)
    dur_b = _duration_ms(analysis_b)
    total = min(dur_a, dur_b)
    plan = {
        "sections": [
            {
                "start_ms": 0,
                "end_ms": total,
                "top_stem": "a",
                "gain_db": {"a": 0.0, "b": -3.0},
                "eq": {},
                "sidechain": False,
                "x_fade": {"curve": "linear"},
                "pitch_shift": {"a": 0.0, "b": 0.0},
                "stretch_ratio": {"a": 1.0, "b": 1.0},
            }
        ]
    }
    _validate(plan, dur_a, dur_b)
    return plan

