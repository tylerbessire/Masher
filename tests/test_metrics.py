from infra.metrics import stage_latency_ms, plan_validation_failures, render_xrt_factor
from prometheus_client import REGISTRY, generate_latest


def test_metrics_exposed():
    stage_latency_ms.labels(stage='test').observe(0.5)
    render_xrt_factor.observe(1.2)
    plan_validation_failures.inc()
    data = generate_latest(REGISTRY)
    assert b'stage_latency_ms' in data
    assert b'render_xrt_factor' in data
    assert b'plan_validation_failures_total' in data
