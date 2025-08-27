import jsonschema
from hypothesis import given, strategies as st

from orchestrator.masterplan import generate_masterplan, PLAN_SCHEMA
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


@given(
    dur_a=st.integers(min_value=1000, max_value=100000),
    dur_b=st.integers(min_value=1000, max_value=100000),
)
def test_plan_within_bounds(dur_a, dur_b):
    plan = generate_masterplan(_analysis(dur_a), _analysis(dur_b))
    jsonschema.validate(plan, PLAN_SCHEMA)
    total = min(dur_a, dur_b)
    for sec in plan["sections"]:
        assert 0 <= sec["start_ms"] < sec["end_ms"] <= total
        assert sec["top_stem"] in {"a", "b"}
        for stem in sec["gain_db"].keys():
            assert stem in {"a", "b"}
