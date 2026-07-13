from __future__ import annotations

import asyncio
import math
import time

import httpx

from app.repositories import LoadTestRepository


class LoadTester:
    def __init__(
        self,
        *,
        target_url: str = "http://localhost:8080/api/demo",
        repository: LoadTestRepository | None = None,
        algorithm_provider=None,
    ) -> None:
        self.active_test: dict | None = None
        self.lock = asyncio.Lock()
        self.target_url = target_url
        self.repository = repository
        self.algorithm_provider = algorithm_provider
        self._task: asyncio.Task | None = None

    async def start_test(self, duration_seconds: int = 30, concurrency: int = 5) -> dict:
        async with self.lock:
            if self.active_test and self.active_test["status"] == "Running":
                return self._public(self.active_test)

            test_id = f"Test-{int(time.time())}"
            algorithm = self.algorithm_provider().value if self.algorithm_provider else None
            self.active_test = {
                "id": test_id,
                "status": "Running",
                "target": self.target_url,
                "started_at": time.time(),
                "duration": duration_seconds,
                "concurrency": concurrency,
                "progress": 0,
                "throughput": 0,
                "avg_latency": 0.0,
                "p50_latency": 0.0,
                "p95_latency": 0.0,
                "p99_latency": 0.0,
                "error_rate": 0.0,
                "success_count": 0,
                "error_count": 0,
                "latencies": [],
                "algorithm": algorithm,
                "database_run_id": None,
            }

            if self.repository is not None:
                self.active_test["database_run_id"] = await self.repository.start(self.active_test)

            self._task = asyncio.create_task(
                self._run_test(test_id, duration_seconds, concurrency),
                name=f"load-test-{test_id}",
            )
            return self._public(self.active_test)

    async def _run_test(self, test_id: str, duration_seconds: int, concurrency: int) -> None:
        client = httpx.AsyncClient(timeout=5.0)
        start_time = time.time()
        end_time = start_time + duration_seconds

        async def worker() -> None:
            while time.time() < end_time:
                async with self.lock:
                    if (
                        not self.active_test
                        or self.active_test["id"] != test_id
                        or self.active_test["status"] != "Running"
                    ):
                        break

                t0 = time.perf_counter()
                try:
                    response = await client.get(self.target_url)
                    latency = (time.perf_counter() - t0) * 1000
                    success = response.status_code < 500
                except Exception:
                    latency = (time.perf_counter() - t0) * 1000
                    success = False

                async with self.lock:
                    if self.active_test and self.active_test["id"] == test_id:
                        self.active_test["latencies"].append(latency)
                        if success:
                            self.active_test["success_count"] += 1
                        else:
                            self.active_test["error_count"] += 1
                await asyncio.sleep(0.05)

        workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
        last_sample_second = -1

        while time.time() < end_time:
            await asyncio.sleep(0.5)
            elapsed = time.time() - start_time
            async with self.lock:
                if not self.active_test or self.active_test["id"] != test_id:
                    break
                self._recalculate(self.active_test, elapsed, duration_seconds)
                snapshot = self._public(self.active_test)
                database_run_id = self.active_test.get("database_run_id")

            current_second = int(elapsed)
            if (
                self.repository is not None
                and database_run_id
                and current_second != last_sample_second
            ):
                last_sample_second = current_second
                await self.repository.sample(database_run_id, snapshot)

        await asyncio.gather(*workers, return_exceptions=True)
        await client.aclose()

        async with self.lock:
            if self.active_test and self.active_test["id"] == test_id:
                self.active_test["status"] = "Completed"
                self._recalculate(self.active_test, duration_seconds, duration_seconds)
                self.active_test["progress"] = 100
                snapshot = self._public(self.active_test)
                database_run_id = self.active_test.get("database_run_id")
            else:
                return

        if self.repository is not None and database_run_id:
            await self.repository.finish(database_run_id, snapshot)

    @staticmethod
    def _recalculate(data: dict, elapsed: float, duration_seconds: int) -> None:
        data["progress"] = min(100, int((elapsed / max(duration_seconds, 1)) * 100))
        total = data["success_count"] + data["error_count"]
        data["throughput"] = int(total / elapsed) if elapsed > 0 else 0
        latencies = sorted(data["latencies"])
        if latencies:
            data["avg_latency"] = round(sum(latencies) / len(latencies), 1)
            data["p50_latency"] = round(_percentile(latencies, 50), 1)
            data["p95_latency"] = round(_percentile(latencies, 95), 1)
            data["p99_latency"] = round(_percentile(latencies, 99), 1)
        data["error_rate"] = round(data["error_count"] / total * 100, 2) if total else 0.0

    async def get_test_status(self) -> dict:
        async with self.lock:
            if not self.active_test:
                return {
                    "id": "None",
                    "status": "Idle",
                    "target": self.target_url,
                    "started_at": 0,
                    "duration": 0,
                    "concurrency": 0,
                    "progress": 0,
                    "throughput": 0,
                    "avg_latency": 0.0,
                    "p50_latency": 0.0,
                    "p95_latency": 0.0,
                    "p99_latency": 0.0,
                    "error_rate": 0.0,
                    "success_count": 0,
                    "error_count": 0,
                }
            return self._public(self.active_test)

    @staticmethod
    def _public(data: dict) -> dict:
        value = dict(data)
        value.pop("latencies", None)
        value.pop("database_run_id", None)
        return value


def _percentile(values: list[float], percentile: int) -> float:
    if not values:
        return 0.0
    index = max(0, math.ceil(percentile / 100 * len(values)) - 1)
    return values[index]
