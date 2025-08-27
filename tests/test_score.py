import numpy as np
import pytest
from core.score import mashability_score


def test_monotonic_behavior():
    energy_a = np.array([0.1, 0.5, 0.2])
    energy_b = np.array([0.1, 0.5, 0.2])
    worse, _ = mashability_score(0.3, 1.2, 0.5, 0.4, 0.6, energy_a, energy_b)
    better, _ = mashability_score(0.8, 1.0, 0.5, 0.4, 0.6, energy_a, energy_b)
    assert better > worse


def test_regression_snapshot():
    energy_a = np.array([0.2, 0.8, 0.1, 0.9])
    energy_b = np.array([0.1, 0.7, 0.3, 0.8])
    score, factors = mashability_score(0.7, 1.05, 0.6, 0.3, 0.35, energy_a, energy_b)
    assert score == pytest.approx(0.834, rel=1e-3)
    assert factors["key"] == 0.7
