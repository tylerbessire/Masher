from prometheus_client import Counter, Histogram

stage_latency_ms = Histogram('stage_latency_ms', 'Stage latency in ms', ['stage'])
render_xrt_factor = Histogram('render_xrt_factor', 'Render speed vs realtime')
plan_validation_failures = Counter('plan_validation_failures', 'Number of plan validation failures')
