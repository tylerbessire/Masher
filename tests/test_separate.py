import numpy as np
import pytest
import soundfile as sf
from pathlib import Path
from unittest.mock import patch

from services.separate.separate import separate, TARGET_LUFS, MAX_PEAK
import pyloudnorm as pyln
import torch


@pytest.fixture
def audio_file(tmp_path: Path) -> Path:
    sr = 44100
    duration = 1.0
    samples = int(sr * duration)
    audio = np.random.randn(samples, 2) * 0.5
    path = tmp_path / "input.wav"
    sf.write(path, audio, sr)
    return path


class _Dummy:
    def to(self, device):
        return self


def _fake_apply_model(model, wav, split=True, overlap=0.25):
    return torch.stack([wav] * 4, dim=1)


@patch("services.separate.separate.apply_model", side_effect=_fake_apply_model)
@patch("services.separate.separate.get_model")
def test_separation_normalizes(get_model_mock, apply_model_mock, audio_file, tmp_path):
    get_model_mock.return_value = _Dummy()
    track_id = "track123"
    out = separate(track_id, audio_file, output_root=tmp_path)

    assert set(out.keys()) == {"drums", "bass", "other", "vocals"}

    info = sf.info(audio_file)
    orig_duration = info.frames / info.samplerate
    meter = pyln.Meter(info.samplerate)

    for path in out.values():
        data, sr = sf.read(path)
        duration = data.shape[0] / sr
        assert abs(duration - orig_duration) <= 0.001
        loudness = meter.integrated_loudness(data)
        assert abs(loudness - TARGET_LUFS) <= 0.3
        assert np.max(np.abs(data)) <= MAX_PEAK + 1e-6
