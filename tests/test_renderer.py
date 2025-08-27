import numpy as np
import soundfile as sf

from orchestrator.masterplan import generate_masterplan
from renderer.engine import render_draft
from schemas.models import Analysis, KeyInfo, Section


def _analysis(duration_ms: int) -> Analysis:
    return Analysis(
        bpm=120.0,
        tempo_conf=1.0,
        key=KeyInfo(pitch_class="C", mode="major"),
        key_conf=1.0,
        beatgrid=[0, duration_ms],
        sections=[Section(label="A", start_ms=0, end_ms=duration_ms)],
        energy=1.0,
        danceability=0.5,
        vocals_presence=0.5,
        chord_segments=[],
    )


def test_render_outputs(tmp_path):
    sr = 22050
    dur_ms = 2000
    samples = int(sr * dur_ms / 1000)
    t = np.linspace(0, dur_ms / 1000, samples, endpoint=False)
    tone_a = np.sin(2 * np.pi * 440 * t).astype(np.float32)
    tone_b = np.sin(2 * np.pi * 660 * t).astype(np.float32)

    plan = generate_masterplan(_analysis(dur_ms), _analysis(dur_ms))
    mix = render_draft(plan, tone_a, tone_b, sr, "pair42", root=tmp_path)

    out_dir = tmp_path / "renders" / "pair42"
    draft, sr_read = sf.read(out_dir / "draft.wav")
    assert sr_read == sr
    assert len(draft) == samples
    assert np.max(np.abs(draft)) <= 1.0
    bus, _ = sf.read(out_dir / "stems_bus.wav")
    assert np.array_equal(draft, bus)
    assert np.allclose(draft, mix, atol=1e-4)
