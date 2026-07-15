from __future__ import annotations

import asyncio
import json
import logging
import socket
from typing import Any

from app.core.config import Settings
from app.repositories import ApiHistoryRepository
from app.services.live_api_events import LiveApiEventHub

logger = logging.getLogger(__name__)


class ApiHistoryWorker:
    def __init__(
        self,
        repository: ApiHistoryRepository,
        settings: Settings,
        event_hub: LiveApiEventHub | None = None,
    ) -> None:
        self.repository = repository
        self.settings = settings
        self.event_hub = event_hub
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
        request_data = event.get("request", {})
        request_id = request_data.get("request_id")
        if not self.repository.database.available:
            if self.event_hub and request_id:
                self.event_hub.publish({
                    "event_type": "history_skipped",
                    "request_id": request_id,
                    "method": request_data.get("http_method"),
                    "path": request_data.get("route"),
                    "phase": "warning",
                    "error_message": "Database unavailable; request history was not queued",
                })
            return False
        try:
            self.queue.put_nowait(event)
            if self.event_hub and request_id:
                self.event_hub.publish({
                    "event_type": "history_queued",
                    "request_id": request_id,
                    "method": request_data.get("http_method"),
                    "path": request_data.get("route"),
                    "phase": "pending",
                    "backend_id": request_data.get("final_backend_id"),
                })
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
                if self.event_hub:
                    request_data = payload.get("request", {})
                    self.event_hub.publish({
                        "event_type": "history_saved",
                        "request_id": request_data.get("request_id"),
                        "method": request_data.get("http_method"),
                        "path": request_data.get("route"),
                        "phase": "success",
                        "backend_id": request_data.get("final_backend_id"),
                        "persisted": True,
                    })
            except Exception as exc:
                logger.exception("Failed to persist API history job %s", job["id"])
                if self.event_hub:
                    request_data = payload.get("request", {}) if isinstance(payload, dict) else {}
                    self.event_hub.publish({
                        "event_type": "history_failed",
                        "request_id": request_data.get("request_id"),
                        "method": request_data.get("http_method"),
                        "path": request_data.get("route"),
                        "phase": "warning",
                        "backend_id": request_data.get("final_backend_id"),
                        "persisted": False,
                        "error_type": type(exc).__name__,
                        "error_message": str(exc),
                    })
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
