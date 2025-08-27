from __future__ import annotations

import math
from typing import Tuple

import numpy as np
import librosa
import pyrubberband as pyrb

from schemas.models import Analysis, Alignment


def _time_stretch(y: np.ndarray, sr: int, rate: float) -> np.ndarray:
    """Stretch audio with Rubber Band, falling back to librosa."""
    try:
        return pyrb.time_stretch(y, sr, rate, rbargs={"-t": "", "-F": ""})
    except Exception:
        return librosa.effects.time_stretch(y, rate=rate)


def align_tempo(
    track_a: Analysis,
    track_b: Analysis,
    audio_a: np.ndarray,
    audio_b: np.ndarray,
    sr: int,
) -> Tuple[np.ndarray, np.ndarray, Alignment]:
    """Align tempos of two tracks, returning stretched audio and alignment info.

    The track requiring the smaller stretch becomes the reference.
    """
    ratio_a = track_b.bpm / track_a.bpm
    ratio_b = track_a.bpm / track_b.bpm
    if abs(1 - ratio_a) <= abs(1 - ratio_b):
        stretch_ratio = ratio_b
        aligned_a = audio_a
        aligned_b = _time_stretch(audio_b, sr, stretch_ratio)
    else:
        stretch_ratio = ratio_a
        aligned_a = _time_stretch(audio_a, sr, stretch_ratio)
        aligned_b = audio_b
    stretch_cents = 1200 * math.log2(stretch_ratio)
    alignment = Alignment(offset_ms=0, stretch_cents=stretch_cents)
    return aligned_a, aligned_b, alignment
