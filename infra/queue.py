import dramatiq
from dramatiq.brokers.stub import StubBroker
from dramatiq.middleware import Retries
from typing import Dict

broker = StubBroker(middleware=[])
broker.add_middleware(Retries(max_retries=5, min_backoff=1, max_backoff=5))
dramatiq.set_broker(broker)

status: Dict[str, str] = {}

@dramatiq.actor(max_retries=5)
def run_stage(job_id: str, fail_once: bool = False) -> None:
  """Process a job stage, optionally failing once to trigger retry."""
  if fail_once and status.get(job_id) != 'retried':
    status[job_id] = 'retried'
    raise RuntimeError('simulated crash')
  status[job_id] = 'completed'
