import json
import sys
from datetime import datetime
from pathlib import Path

import jsonschema
import pytest
from pydantic import ValidationError

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from schemas.models import Track, Analysis, MashPlan, RenderJob, Provenance

SCHEMAS_DIR = Path(__file__).parent.parent / "schemas"


def load_schema(name: str) -> dict:
    with open(SCHEMAS_DIR / f"{name}.json", "r", encoding="utf-8") as f:
        return json.load(f)


track_data = {
    "id": "track123",
    "title": "Test Song",
    "artist": "Test Artist",
    "source_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "storage_uri": "/data/raw/track123.m4a",
    "duration_sec": 210.5,
    "loudness_lufs": -14.0,
    "sample_rate": 44100,
    "channels": 2,
}

analysis_data = {
    "bpm": 120.0,
    "tempo_conf": 0.95,
    "key": {"pitch_class": "C", "mode": "major"},
    "key_conf": 0.9,
    "beatgrid": [0, 500, 1000],
    "sections": [{"label": "intro", "start_ms": 0, "end_ms": 10000}],
    "energy": 0.8,
    "danceability": 0.7,
    "vocals_presence": 0.6,
    "chord_segments": [{"start_ms": 0, "chord": "C", "conf": 0.9}],
}

mash_plan_data = {
    "pair_id": "pair123",
    "alignment": {"offset_ms": 100, "stretch_cents": 5.0},
    "key_strategy": {"pitch_shift_semitones": -1.0},
    "stems_strategy": "vocals_drums",
    "structure_map": "ABAB",
    "fx": {
        "ducking": {"enabled": True, "threshold_db": -20.0, "ratio": 4.0},
        "eq": {"bands": [{"frequency_hz": 100, "gain_db": -3.0, "q": 1.0}]},
        "comp": {
            "threshold_db": -18.0,
            "ratio": 2.0,
            "attack_ms": 10.0,
            "release_ms": 100.0,
        },
    },
}

provenance_data = {
    "tool_versions": {"yt-dlp": "2024.04.09"},
    "seeds": {"separation": 42},
    "timestamps": {"downloaded": datetime(2024, 1, 1, 12, 0, 0).isoformat() + "Z"},
    "git_sha": "abc123",
}

render_job_data = {
    "id": "job1",
    "pair_id": "pair123",
    "mash_plan": mash_plan_data,
    "output_uri": "/data/render/job1.wav",
    "provenance": provenance_data,
    "status": "pending",
}


@pytest.mark.parametrize(
    "model_cls,data,name",
    [
        (Track, track_data, "Track"),
        (Analysis, analysis_data, "Analysis"),
        (MashPlan, mash_plan_data, "MashPlan"),
        (Provenance, provenance_data, "Provenance"),
        (RenderJob, render_job_data, "RenderJob"),
    ],
)
def test_roundtrip_and_schema_validation(model_cls, data, name):
    schema = load_schema(name)
    jsonschema.validate(data, schema)
    model = model_cls(**data)
    assert json.loads(model.model_dump_json()) == data

    first_key = next(iter(data.keys()))
    with pytest.raises(ValidationError):
        invalid = data.copy()
        invalid.pop(first_key)
        model_cls(**invalid)

    with pytest.raises(ValidationError):
        model_cls(**{**data, "unknown": 1})
