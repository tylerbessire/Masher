import json
import base64
import io
import numpy as np
import soundfile as sf


def test_golden_json_integrity():
    with open('tests/golden/Analysis.json') as f:
        analysis = json.load(f)
    assert analysis['tempo'] == 120
    with open('tests/golden/MashPlan.json') as f:
        plan = json.load(f)
    assert plan['sections'][0]['end'] == 1


def test_golden_audio_metrics():
    with open('tests/golden/draft.wav.b64') as f:
        raw = base64.b64decode(f.read())
    audio, sr = sf.read(io.BytesIO(raw))
    rms = np.sqrt(np.mean(audio**2))
    assert 0.6 < rms < 0.8
    assert sr == 44100
