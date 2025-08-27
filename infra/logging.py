import logging
import structlog
from contextvars import ContextVar
from typing import Any, Dict

_run_id: ContextVar[str | None] = ContextVar('run_id', default=None)


def set_run_id(run_id: str) -> None:
  _run_id.set(run_id)


def get_logger() -> structlog.stdlib.BoundLogger:
  processors = [
      structlog.contextvars.merge_contextvars,
      structlog.processors.TimeStamper(fmt="iso"),
      structlog.processors.JSONRenderer()
  ]
  structlog.configure(processors=processors, wrapper_class=structlog.stdlib.BoundLogger)
  logger = structlog.get_logger()
  rid = _run_id.get()
  if rid:
    logger = logger.bind(run_id=rid)
  return logger


class TimedStage:
  def __init__(self, stage: str):
    self.stage = stage

  def __enter__(self) -> None:
    self.logger = get_logger().bind(stage=self.stage)
    self.logger.info('start')

  def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
    if exc:
      self.logger.error('error', error=str(exc))
    self.logger.info('end')
