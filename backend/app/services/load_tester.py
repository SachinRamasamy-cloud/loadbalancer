from __future__ import annotations

import asyncio
import time
import httpx


class LoadTester:
    def __init__(self) -> None:
        self.active_test: dict | None = None
        self.lock = asyncio.Lock()

    async def start_test(self, duration_seconds: int = 30, concurrency: int = 5) -> dict:
        async with self.lock:
            if self.active_test and self.active_test["status"] == "Running":
                return self.active_test

            test_id = f"Test-{int(time.time())}"
            self.active_test = {
                "id": test_id,
                "status": "Running",
                "target": "/api/demo",
                "started_at": time.time(),
                "duration": duration_seconds,
                "concurrency": concurrency,
                "progress": 0,
                "throughput": 0,
                "avg_latency": 0.0,
                "p95_latency": 0.0,
                "error_rate": 0.0,
                "success_count": 0,
                "error_count": 0,
                "latencies": []
            }

            # Start background task
            asyncio.create_task(self._run_test(test_id, duration_seconds, concurrency))
            return self.active_test

    async def _run_test(self, test_id: str, duration_seconds: int, concurrency: int) -> None:
        # We will make HTTP requests to localhost:8080/api/demo
        url = "http://localhost:8080/api/demo"
        client = httpx.AsyncClient(timeout=5.0)

        start_time = time.time()
        end_time = start_time + duration_seconds

        async def worker():
            while time.time() < end_time:
                # Read active test status
                async with self.lock:
                    if not self.active_test or self.active_test["id"] != test_id or self.active_test["status"] != "Running":
                        break

                t0 = time.perf_counter()
                try:
                    resp = await client.get(url)
                    latency = (time.perf_counter() - t0) * 1000
                    success = resp.status_code < 500
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

                # yield control to loop
                await asyncio.sleep(0.05)

        # Run workers concurrently
        workers = [asyncio.create_task(worker()) for _ in range(concurrency)]

        # Monitor progress
        while time.time() < end_time:
            await asyncio.sleep(0.5)
            elapsed = time.time() - start_time
            progress = min(100, int((elapsed / duration_seconds) * 100))

            async with self.lock:
                if not self.active_test or self.active_test["id"] != test_id:
                    break
                self.active_test["progress"] = progress
                total_reqs = self.active_test["success_count"] + self.active_test["error_count"]
                if elapsed > 0:
                    self.active_test["throughput"] = int(total_reqs / elapsed)

                lats = sorted(self.active_test["latencies"])
                if lats:
                    self.active_test["avg_latency"] = round(sum(lats) / len(lats), 1)
                    idx_p95 = max(0, int(len(lats) * 0.95) - 1)
                    self.active_test["p95_latency"] = round(lats[idx_p95], 1)

                if total_reqs > 0:
                    self.active_test["error_rate"] = round((self.active_test["error_count"] / total_reqs) * 100, 2)

        await asyncio.gather(*workers, return_exceptions=True)
        await client.aclose()

        async with self.lock:
            if self.active_test and self.active_test["id"] == test_id:
                self.active_test["status"] = "Completed"
                self.active_test["progress"] = 100
                total_reqs = self.active_test["success_count"] + self.active_test["error_count"]
                if total_reqs > 0:
                    self.active_test["error_rate"] = round((self.active_test["error_count"] / total_reqs) * 100, 2)
                lats = sorted(self.active_test["latencies"])
                if lats:
                    self.active_test["avg_latency"] = round(sum(lats) / len(lats), 1)
                    idx_p95 = max(0, int(len(lats) * 0.95) - 1)
                    self.active_test["p95_latency"] = round(lats[idx_p95], 1)

    async def get_test_status(self) -> dict:
        async with self.lock:
            if not self.active_test:
                return {
                    "id": "None",
                    "status": "Idle",
                    "target": "/api/demo",
                    "started_at": 0,
                    "duration": 0,
                    "concurrency": 0,
                    "progress": 0,
                    "throughput": 0,
                    "avg_latency": 0.0,
                    "p95_latency": 0.0,
                    "error_rate": 0.0,
                    "success_count": 0,
                    "error_count": 0,
                    "latencies": []
                }

            # Avoid sending huge latency lists over network
            ret = dict(self.active_test)
            ret.pop("latencies", None)
            return ret
