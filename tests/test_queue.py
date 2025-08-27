import dramatiq
from infra.queue import broker, run_stage, status


def test_retry_and_completion():
    message = run_stage.send('job1', fail_once=True)
    worker = dramatiq.Worker(broker, worker_threads=1, worker_timeout=100)
    worker.start()
    broker.join(run_stage.queue_name)
    worker.stop()
    assert status['job1'] == 'completed'
    assert broker.dead_letters == []
