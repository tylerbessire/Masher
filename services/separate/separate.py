from __future__ import annotations

import numpy as np
import torch
import torchaudio
from demucs.pretrained import get_model
from demucs.apply import apply_model
from pathlib import Path
from typing import Dict
import soundfile as sf
import pyloudnorm as pyln

TARGET_LUFS = -14.0
MAX_PEAK = 10 ** (-1 / 20)  # -1 dBFS in linear scale


class SeparationError(Exception):
    """Base error for separation failures."""


def _normalize(audio: np.ndarray, sr: int) -> np.ndarray:
    """Return audio normalized to TARGET_LUFS and clamped to MAX_PEAK."""
    meter = pyln.Meter(sr)  # type: ignore[arg-type]
    loudness = meter.integrated_loudness(audio)
    gain_db = TARGET_LUFS - loudness
    audio = audio * (10 ** (gain_db / 20))
    peak = np.max(np.abs(audio))
    if peak > MAX_PEAK:
        audio *= MAX_PEAK / peak
    return audio


def separate(
    track_id: str,
    src_path: Path,
    output_root: Path = Path("/data/stems"),
    model_name: str = "htdemucs",
    mdx_fallback: str = "mdx_extra_q",
    dither: bool = False,
) -> Dict[str, Path]:
    """Separate ``src_path`` into stems for ``track_id``.

    Returns mapping of stem name to output path.
    """
    device = "cuda" if torch.cuda.is_available() else "cpu"
    wav, sr = torchaudio.load(str(src_path))
    wav = wav.to(device)

    try:
        model = get_model(model_name).to(device)
    except Exception:
        model = get_model(mdx_fallback).to(device)

    with torch.no_grad():
        stems = apply_model(model, wav[None], split=True, overlap=0.25)[0]

    stem_names = ["drums", "bass", "other", "vocals"]
    out_dir = output_root / track_id
    out_dir.mkdir(parents=True, exist_ok=True)
    result: Dict[str, Path] = {}

    for i, name in enumerate(stem_names):
        audio = stems[i].cpu().numpy().T  # shape (time, channels)
        audio = _normalize(audio, sr)
        if dither:
            audio += np.random.uniform(-1 / 2**15, 1 / 2**15, size=audio.shape)
        out_path = out_dir / f"{name}.wav"
        sf.write(out_path, audio, sr)
        result[name] = out_path

    return result
