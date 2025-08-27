from __future__ import annotations

from pathlib import Path
from typing import Dict, Any

import numpy as np
import soundfile as sf


def render_draft(
    plan: Dict[str, Any],
    audio_a: np.ndarray,
    audio_b: np.ndarray,
    sample_rate: int,
    pair_id: str,
    root: Path | str = Path("data"),
) -> np.ndarray:
    """Render a draft mashup according to a master plan.

    The implementation mixes the two input tracks using the gain settings in the
    plan. It writes the result to ``draft.wav`` and ``stems_bus.wav`` inside
    ``{root}/renders/{pair_id}`` and returns the mixed waveform.
    """
    root = Path(root)
    out_dir = root / "renders" / pair_id
    out_dir.mkdir(parents=True, exist_ok=True)

    total_ms = max(sec["end_ms"] for sec in plan["sections"])
    total_samples = int(total_ms / 1000 * sample_rate)
    mix = np.zeros(total_samples, dtype=np.float32)

    def _gain(v):
        return 10 ** (v / 20.0)

    for sec in plan["sections"]:
        start = int(sec["start_ms"] / 1000 * sample_rate)
        end = int(sec["end_ms"] / 1000 * sample_rate)
        ga = _gain(sec["gain_db"].get("a", -120.0))
        gb = _gain(sec["gain_db"].get("b", -120.0))
        seg_a = audio_a[start:end]
        seg_b = audio_b[start:end]
        length = min(len(seg_a), len(seg_b))
        mix[start : start + length] += ga * seg_a[:length] + gb * seg_b[:length]

    peak = float(np.max(np.abs(mix))) if mix.size else 0.0
    if peak > 1.0:
        mix *= 0.98 / peak

    sf.write(out_dir / "draft.wav", mix, sample_rate)
    sf.write(out_dir / "stems_bus.wav", mix, sample_rate)
    return mix

