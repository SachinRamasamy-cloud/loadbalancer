from __future__ import annotations

import asyncio
import math
import time
from collections import Counter, deque
from dataclasses import asdict, dataclass
from datetime import datetime, timezone


@dataclass(slots=True)
class RequestRecord:
    request_id: str
    timestamp: str
    method: str
    path: str
    backend_id: str | None
    status_code: int
    duration_ms: float
    error: str | None = None
    retry_count: int = 0


class MetricsStore:
    def __init__(self, max_records: int = 5000) -> None:
        self._records: deque[RequestRecord] = deque(maxlen=max_records)
        self._started = time.monotonic()
        self._lock = asyncio.Lock()

    async def record(self, item: RequestRecord) -> None:
        async with self._lock:
            self._records.append(item)

    async def recent_logs(self, limit: int = 100) -> list[dict]:
        async with self._lock:
            return [asdict(item) for item in list(self._records)[-limit:]][::-1]

    async def overview(self) -> dict:
        async with self._lock:
            records = list(self._records)
        total = len(records)
        errors = sum(1 for item in records if item.status_code >= 500 or item.error)
        durations = sorted(item.duration_ms for item in records)
        uptime = max(time.monotonic() - self._started, 1)
        return {
            "total_requests": total,
            "requests_per_second": round(total / uptime, 2),
            "average_latency_ms": round(sum(durations) / total, 2) if total else 0,
            "p95_latency_ms": round(_percentile(durations, 95), 2),
            "p99_latency_ms": round(_percentile(durations, 99), 2),
            "error_rate": round(errors / total * 100, 2) if total else 0,
            "status_codes": dict(Counter(str(item.status_code) for item in records)),
            "backend_distribution": dict(Counter(item.backend_id or "none" for item in records)),
        }

    async def timeseries(self, buckets: int = 20, bucket_seconds: int = 15) -> list[dict]:
        now = datetime.now(timezone.utc).timestamp()
        start = now - buckets * bucket_seconds
        async with self._lock:
            records = list(self._records)
        output = []
        for index in range(buckets):
            bucket_start = start + index * bucket_seconds
            bucket_end = bucket_start + bucket_seconds
            selected = [
                item for item in records
                if bucket_start <= datetime.fromisoformat(item.timestamp).timestamp() < bucket_end
            ]
            output.append({
                "time": datetime.fromtimestamp(bucket_end, timezone.utc).strftime("%H:%M:%S"),
                "requests": len(selected),
                "errors": sum(1 for item in selected if item.status_code >= 500 or item.error),
                "avg_latency_ms": round(sum(item.duration_ms for item in selected) / len(selected), 2)
                if selected else 0,
            })
        return output


def _percentile(values: list[float], percentile: int) -> float:
    if not values:
        return 0.0
    index = max(0, math.ceil(percentile / 100 * len(values)) - 1)
    return values[index]
