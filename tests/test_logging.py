import json
import contextlib
from io import StringIO
from infra.logging import set_run_id, get_logger, TimedStage


def test_structured_logging_with_run_id():
    buf = StringIO()
    with contextlib.redirect_stdout(buf):
        set_run_id('run123')
        logger = get_logger()
        logger.info('hello')
    record = json.loads(buf.getvalue().splitlines()[0])
    assert record['run_id'] == 'run123'


def test_timed_stage_context_manager():
    buf = StringIO()
    with contextlib.redirect_stdout(buf):
        set_run_id('run123')
        with TimedStage('test'):
            pass
    lines = [json.loads(l) for l in buf.getvalue().splitlines() if l]
    assert any(l.get('stage') == 'test' and l.get('event') == 'start' for l in lines)
    assert any(l.get('stage') == 'test' and l.get('event') == 'end' for l in lines)
