from schemas.models import KeyInfo
from core.harmony import suggest_key_strategy


def test_known_compatible_pair():
    a = KeyInfo(pitch_class="A", mode="minor")  # 8A
    b = KeyInfo(pitch_class="E", mode="minor")  # 9A
    strategy, confidence = suggest_key_strategy(a, b)
    assert strategy.pitch_shift_semitones == 0
    assert confidence > 0.6


def test_incompatible_penalty():
    a = KeyInfo(pitch_class="C", mode="major")
    b = KeyInfo(pitch_class="F#", mode="minor")
    _, confidence = suggest_key_strategy(a, b)
    assert confidence < 0.5
