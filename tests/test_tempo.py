import numpy as np
from core.tempo import align_tempo
from schemas.models import Analysis, KeyInfo


def _click_track(bpm: float, duration: float, sr: int = 22050):
    beat_interval = 60.0 / bpm
    t = np.arange(0, int(duration * sr)) / sr
    y = np.zeros_like(t)
    beat_times = np.arange(0, duration, beat_interval)
    beat_samples = (beat_times * sr).astype(int)
    y[beat_samples] = 1.0
    beat_ms = (beat_times * 1000).astype(int).tolist()
    return y, beat_ms


def _analysis(bpm: float, beatgrid):
    return Analysis(
        bpm=bpm,
        tempo_conf=1.0,
        key=KeyInfo(pitch_class="C", mode="major"),
        key_conf=1.0,
        beatgrid=beatgrid,
        sections=[],
        energy=1.0,
        danceability=0.5,
        vocals_presence=0.5,
        chord_segments=[],
    )


def test_alignment_accuracy():
    sr = 22050
    y_a, beats_a = _click_track(120, 4, sr)
    y_b, beats_b = _click_track(100, 4.8, sr)
    analysis_a = _analysis(120, beats_a)
    analysis_b = _analysis(100, beats_b)
    aligned_a, aligned_b, alignment = align_tempo(analysis_a, analysis_b, y_a, y_b, sr)
    ratio = 2 ** (alignment.stretch_cents / 1200)
    stretched_beats_b = [int(b / ratio) for b in beats_b]
    for b1, b2 in zip(beats_a[:4], stretched_beats_b[:4]):
        assert abs(b1 - b2) <= 20
    corr = np.corrcoef(aligned_a[:1000], aligned_b[:1000])[0, 1]
    assert corr > 0.9
