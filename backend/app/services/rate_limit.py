from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass


@dataclass(slots=True)
class Window:
    started_at: float
    count: int


class FixedWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._windows: dict[str, Window] = {}
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        async with self._lock:
            current = self._windows.get(key)
            if current is None or now - current.started_at >= self.window_seconds:
                current = Window(started_at=now, count=0)
                self._windows[key] = current
            current.count += 1
            remaining = max(0, self.limit - current.count)
            if len(self._windows) > 10000:
                self._windows = {
                    item_key: item for item_key, item in self._windows.items()
                    if now - item.started_at < self.window_seconds
                }
            return current.count <= self.limit, remaining
