from __future__ import annotations

import math
from typing import Tuple

from schemas.models import KeyInfo, KeyStrategy

# Camelot wheel mappings copied from analyze service to avoid cross import
_CAMELot_MAJOR = {
    "C": "8B", "C#": "3B", "D": "10B", "Eb": "5B", "E": "12B", "F": "7B",
    "F#": "2B", "G": "9B", "Ab": "4B", "A": "11B", "Bb": "6B", "B": "1B",
}
_CAMELot_MINOR = {
    "C": "5A", "C#": "12A", "D": "7A", "Eb": "2A", "E": "9A", "F": "4A",
    "F#": "11A", "G": "6A", "Ab": "1A", "A": "8A", "Bb": "3A", "B": "10A",
}
_PITCHES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]


def _camelot(key: KeyInfo) -> Tuple[int, str]:
    """Return camelot number and mode letter."""
    mapping = _CAMELot_MAJOR if key.mode == "major" else _CAMELot_MINOR
    code = mapping[key.pitch_class]
    num = int(code[:-1])
    letter = code[-1]
    return num, letter


def _shift_pitch_class(pc: str, semitones: int) -> str:
    idx = (_PITCHES.index(pc) + semitones) % 12
    return _PITCHES[idx]


def _camelot_distance(a: Tuple[int, str], b: Tuple[int, str]) -> float:
    num_a, mode_a = a
    num_b, mode_b = b
    wheel_dist = min(abs(num_a - num_b), 12 - abs(num_a - num_b))
    if num_a == num_b and mode_a != mode_b:
        mode_pen = 0.5  # relative major/minor
    elif mode_a != mode_b:
        mode_pen = 1.0  # modal interchange
    else:
        mode_pen = 0.0
    return wheel_dist + mode_pen


def suggest_key_strategy(track_a: KeyInfo, track_b: KeyInfo) -> Tuple[KeyStrategy, float]:
    """Suggest pitch shift in semitones for track_b to best match track_a.

    Returns a KeyStrategy and a confidence score [0,1].
    """
    best_shift = 0
    best_penalty = math.inf
    code_a = _camelot(track_a)
    for shift in range(-3, 4):
        shifted_pc = _shift_pitch_class(track_b.pitch_class, shift)
        shifted_key = KeyInfo(pitch_class=shifted_pc, mode=track_b.mode)
        code_b = _camelot(shifted_key)
        dist = _camelot_distance(code_a, code_b)
        penalty = dist + abs(shift) * 1.0  # discourage large shifts strongly
        if penalty < best_penalty:
            best_penalty = penalty
            best_shift = shift
    confidence = max(0.0, 1.0 - best_penalty / 6.0)
    return KeyStrategy(pitch_shift_semitones=float(best_shift)), confidence
