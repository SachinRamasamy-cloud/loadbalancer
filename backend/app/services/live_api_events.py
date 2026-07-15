from __future__ import annotations

import asyncio
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator


class LiveApiEventHub:
    """In-process fan-out hub for live API lifecycle events.

    The hub is deliberately non-blocking. Publishing a visualization event must
    never delay request routing. Slow subscribers lose their oldest queued
    event instead of applying backpressure to FastAPI.
    """

    def __init__(
        self,
        *,
        enabled: bool = True,
        history_size: int = 10_000,
        subscriber_queue_size: int = 10_000,
    ) -> None:
        self.enabled = enabled
        self.history_size = max(100, history_size)
        self.subscriber_queue_size = max(100, subscriber_queue_size)
        self._history: deque[dict[str, Any]] = deque(maxlen=self.history_size)
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._sequence = 0
        self.published_events = 0
        self.dropped_subscriber_events = 0

    def publish(self, event: dict[str, Any]) -> None:
        if not self.enabled:
            return

        self._sequence += 1
        envelope = {
            "sequence": self._sequence,
            "event_id": event.get("event_id") or f"evt-{time.time_ns()}-{self._sequence}",
            "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            **event,
        }
        self._history.append(envelope)
        self.published_events += 1

        for queue in tuple(self._subscribers):
            try:
                queue.put_nowait(envelope)
            except asyncio.QueueFull:
                self.dropped_subscriber_events += 1
                try:
                    queue.get_nowait()
                    queue.task_done()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(envelope)
                except asyncio.QueueFull:
                    self.dropped_subscriber_events += 1

    def recent(self, limit: int = 250) -> list[dict[str, Any]]:
        bounded = min(max(limit, 0), self.history_size)
        if bounded == 0:
            return []
        return list(self._history)[-bounded:]

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "subscribers": len(self._subscribers),
            "history_size": len(self._history),
            "history_capacity": self.history_size,
            "subscriber_queue_capacity": self.subscriber_queue_size,
            "published_events": self.published_events,
            "dropped_subscriber_events": self.dropped_subscriber_events,
        }

    @asynccontextmanager
    async def subscribe(self) -> AsyncIterator[asyncio.Queue[dict[str, Any]]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(
            maxsize=self.subscriber_queue_size
        )
        self._subscribers.add(queue)
        try:
            yield queue
        finally:
            self._subscribers.discard(queue)
