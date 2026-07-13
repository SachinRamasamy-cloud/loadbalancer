from __future__ import annotations

import asyncio
import json
import logging
import socket
from typing import Any

from app.core.config import Settings
from app.repositories import ApiHistoryRepository

logger = logging.getLogger(__name__)


class ApiHistoryWorker:
    def __init__(self, repository: ApiHistoryRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings
        self.worker_id = f"{socket.gethostname()}-{id(self)}"
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(
            maxsize=settings.telemetry_queue_max_size
        )
        self.dropped_events = 0
        self._stop = asyncio.Event()
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self.run(), name="api-history-worker")

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            try:
                await asyncio.wait_for(self._task, timeout=10)
            except TimeoutError:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass

    def submit(self, event: dict[str, Any]) -> bool:
        if not self.repository.database.available:
            return False
        try:
            self.queue.put_nowait(event)
            return True
        except asyncio.QueueFull:
            self.dropped_events += 1
            logger.warning("API history queue is full; event dropped")
            return False

    async def run(self) -> None:
        interval = self.settings.telemetry_flush_interval_ms / 1000
        while not self._stop.is_set() or not self.queue.empty():
            try:
                await self._flush_local_queue()
                await self._process_database_jobs()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("API history worker iteration failed")
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=interval)
            except TimeoutError:
                pass

    async def _flush_local_queue(self) -> None:
        batch: list[dict[str, Any]] = []
        while len(batch) < self.settings.telemetry_batch_size:
            try:
                batch.append(self.queue.get_nowait())
            except asyncio.QueueEmpty:
                break
        if not batch:
            return
        try:
            await self.repository.enqueue_many(batch)
        except Exception:
            for item in batch:
                try:
                    self.queue.put_nowait(item)
                except asyncio.QueueFull:
                    self.dropped_events += 1
            raise
        finally:
            for _ in batch:
                self.queue.task_done()

    async def _process_database_jobs(self) -> None:
        jobs = await self.repository.claim(
            self.worker_id,
            self.settings.telemetry_batch_size,
            self.settings.telemetry_lock_timeout_seconds,
        )
        for job in jobs:
            payload = job["payload"]
            if isinstance(payload, str):
                payload = json.loads(payload)
            try:
                await self.repository.save_and_complete(
                    str(job["id"]), self.worker_id, payload
                )
            except Exception as exc:
                logger.exception("Failed to persist API history job %s", job["id"])
                try:
                    await self.repository.fail(str(job["id"]), self.worker_id, exc)
                except Exception:
                    logger.exception("Failed to mark API history job as failed")

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.repository.database.available,
            "worker_id": self.worker_id,
            "queue_size": self.queue.qsize(),
            "queue_capacity": self.settings.telemetry_queue_max_size,
            "dropped_events": self.dropped_events,
            "running": self._task is not None and not self._task.done(),
        }
