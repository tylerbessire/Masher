from __future__ import annotations

from typing import Dict, Tuple

import numpy as np


def section_overlap(sections_a, sections_b) -> float:
    """Compute overlap ratio between two sets of sections."""
    total_a = sum(s.end_ms - s.start_ms for s in sections_a)
    total_b = sum(s.end_ms - s.start_ms for s in sections_b)
    if not total_a or not total_b:
        return 0.0
    overlap = 0
    for sa in sections_a:
        for sb in sections_b:
            start = max(sa.start_ms, sb.start_ms)
            end = min(sa.end_ms, sb.end_ms)
            if end > start:
                overlap += end - start
    return overlap / min(total_a, total_b)


def mashability_score(
    key_confidence: float,
    tempo_ratio: float,
    section_overlap_score: float,
    vocal_density_a: float,
    vocal_density_b: float,
    energy_a: np.ndarray,
    energy_b: np.ndarray,
) -> Tuple[float, Dict[str, float]]:
    """Compute mashability score between 0 and 1 with rationale."""
    tempo_factor = max(0.0, 1.0 - abs(1 - tempo_ratio))
    vocal_conflict = 1.0 - abs(vocal_density_a - vocal_density_b)
    if len(energy_a) != len(energy_b):
        L = min(len(energy_a), len(energy_b))
        energy_a = energy_a[:L]
        energy_b = energy_b[:L]
    energy_corr = float(np.corrcoef(energy_a, energy_b)[0, 1]) if len(energy_a) and len(energy_b) else 0.0
    energy_factor = (energy_corr + 1.0) / 2.0
    factors = {
        "key": key_confidence,
        "tempo": tempo_factor,
        "sections": section_overlap_score,
        "vocals": vocal_conflict,
        "energy": energy_factor,
    }
    score = float(np.clip(np.mean(list(factors.values())), 0.0, 1.0))
    return score, factors
