from pathlib import Path

import numpy as np
import soundfile as sf
import librosa

from services.analyze.analyze import analyze_track


def _synth(bpm: float, root: str, mode: str, duration: float = 10.0, sr: int = 22050):
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    intervals = [0, 3, 7] if mode == "minor" else [0, 4, 7]
    root_hz = librosa.note_to_hz(f"{root}3")
    freqs = [root_hz * 2 ** (i / 12) for i in intervals]
    chord = sum(np.sin(2 * np.pi * f * t) for f in freqs) / len(freqs)
    beat_times = np.arange(0, duration, 60.0 / bpm)
    clicks = librosa.clicks(times=beat_times, sr=sr, click_freq=1000, length=len(t))
    y = 0.7 * clicks + 0.3 * chord
    return y, sr


def _write_temp(path: Path, bpm: float, root: str, mode: str):
    y, sr = _synth(bpm, root, mode)
    sf.write(path, y, sr)


def test_stayin_alive(tmp_path: Path):
    audio = tmp_path / "stayin_alive.wav"
    _write_temp(audio, 103, "F#", "minor")
    analysis = analyze_track(audio, "stayin_alive")
    assert abs(analysis.bpm - 103) <= 2
    assert analysis.key.mode == "minor"


def test_billie_jean(tmp_path: Path):
    audio = tmp_path / "billie_jean.wav"
    _write_temp(audio, 117, "F#", "minor")
    analysis = analyze_track(audio, "billie_jean")
    assert abs(analysis.bpm - 117) <= 2
    assert analysis.key.mode == "minor"
