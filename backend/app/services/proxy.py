from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, Request, status
from starlette.responses import StreamingResponse

from app.core.config import Settings
from app.domain.errors import NoHealthyBackendError, RequestBodyTooLargeError
from app.services.api_history_worker import ApiHistoryWorker
from app.services.metrics import MetricsStore, RequestRecord
from app.services.live_api_events import LiveApiEventHub
from app.services.registry import BackendRegistry
from app.services.router import TrafficRouter

HOP_BY_HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te",
    "trailers", "transfer-encoding", "upgrade",
}
SAFE_RETRY_METHODS = {"GET", "HEAD", "OPTIONS"}


class ProxyService:
    def __init__(
        self,
        *,
        client: httpx.AsyncClient,
        registry: BackendRegistry,
        router: TrafficRouter,
        metrics: MetricsStore,
        settings: Settings,
        history_worker: ApiHistoryWorker | None = None,
        event_hub: LiveApiEventHub | None = None,
    ) -> None:
        self.client = client
        self.registry = registry
        self.router = router
        self.metrics = metrics
        self.settings = settings
        self.history_worker = history_worker
        self.event_hub = event_hub

    async def forward(self, request: Request, path: str) -> StreamingResponse:
        if request.method == "CONNECT":
            raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail="CONNECT is disabled")

        declared_length = request.headers.get("content-length")
        request_size = None
        if declared_length:
            try:
                request_size = int(declared_length)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid Content-Length header") from exc
            if request_size < 0:
                raise HTTPException(status_code=400, detail="Invalid Content-Length header")
            if request_size > self.settings.max_request_body_bytes:
                raise HTTPException(status_code=413, detail="Request body exceeds configured limit")

        received_at = datetime.now(timezone.utc)
        total_started = time.perf_counter()
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        correlation_id = request.headers.get("x-correlation-id") or request_id
        attempted: set[str] = set()
        attempts: list[dict] = []
        max_attempts = 2 if request.method in SAFE_RETRY_METHODS else 1
        last_error: Exception | None = None

       for attempt_index in range(max_attempts):
    try:
        backend = await self.router.reserve(
            attempted
        )
    except NoHealthyBackendError:
        break

    attempted.add(backend.id)
            # await self.registry.acquire(backend.id)
            attempt_started_at = datetime.now(timezone.utc)
            attempt_started = time.perf_counter()
            self._publish_event(
                "backend_selected",
                request=request,
                request_id=request_id,
                correlation_id=correlation_id,
                backend_id=backend.id,
                attempt_number=attempt_index + 1,
                algorithm=self.router.algorithm_name.value,
                phase="pending",
            )
            self._publish_event(
                "attempt_started",
                request=request,
                request_id=request_id,
                correlation_id=correlation_id,
                backend_id=backend.id,
                attempt_number=attempt_index + 1,
                algorithm=self.router.algorithm_name.value,
                phase="pending",
            )
            try:
                target = f"{backend.url}/{path.lstrip('/')}"
                if request.url.query:
                    target = f"{target}?{request.url.query}"
                headers = self._request_headers(request, request_id, correlation_id)
                content = self._limited_body(request)
                upstream_request = self.client.build_request(
                    request.method,
                    target,
                    headers=headers,
                    content=content,
                )
                upstream = await self.client.send(upstream_request, stream=True)
                response_headers = self._response_headers(upstream)
                if self.settings.expose_selected_backend_header:
                    response_headers["x-selected-backend"] = backend.id
                response_headers["x-request-id"] = request_id
                response_headers["x-correlation-id"] = correlation_id

                async def stream() -> AsyncIterator[bytes]:
                    stream_error: Exception | None = None
                    response_bytes = 0
                    try:
                        async for chunk in upstream.aiter_bytes():
                            response_bytes += len(chunk)
                            yield chunk
                    except Exception as exc:
                        stream_error = exc
                        raise
                    finally:
                        await upstream.aclose()
                        completed_at = datetime.now(timezone.utc)
                        attempt_duration = (time.perf_counter() - attempt_started) * 1000
                        total_duration = (time.perf_counter() - total_started) * 1000
                        is_error = stream_error is not None or upstream.status_code >= 500
                        await self.registry.release(
                            backend.id,
                            error=is_error,
                            latency_ms=attempt_duration,
                        )
                        attempts.append({
                            "attempt_number": attempt_index + 1,
                            "backend_id": backend.id,
                            "selected_algorithm": self.router.algorithm_name.value,
                            "started_at": attempt_started_at.isoformat(),
                            "completed_at": completed_at.isoformat(),
                            "duration_ms": round(attempt_duration, 3),
                            "upstream_status_code": upstream.status_code,
                            "outcome": "internal_error" if stream_error else (
                                "upstream_error" if upstream.status_code >= 500 else "success"
                            ),
                            "retryable": False,
                            "retry_scheduled": False,
                            "error_type": type(stream_error).__name__ if stream_error else None,
                            "error_code": "RESPONSE_STREAM_ERROR" if stream_error else None,
                            "error_message": str(stream_error) if stream_error else None,
                            "metadata": {},
                        })
                        self._publish_event(
                            "attempt_completed" if not is_error else "attempt_failed",
                            request=request,
                            request_id=request_id,
                            correlation_id=correlation_id,
                            backend_id=backend.id,
                            attempt_number=attempt_index + 1,
                            algorithm=self.router.algorithm_name.value,
                            phase="error" if is_error else "success",
                            status_code=upstream.status_code,
                            duration_ms=round(attempt_duration, 3),
                            error_type=type(stream_error).__name__ if stream_error else None,
                            error_message=str(stream_error) if stream_error else None,
                        )
                        error_text = (
                            f"{type(stream_error).__name__}: {stream_error}"
                            if stream_error else None
                        )
                        await self.metrics.record(RequestRecord(
                            request_id=request_id,
                            timestamp=completed_at.isoformat(),
                            method=request.method,
                            path=request.url.path,
                            backend_id=backend.id,
                            status_code=upstream.status_code,
                            duration_ms=round(total_duration, 2),
                            error=error_text,
                            retry_count=attempt_index,
                        ))
                        self._submit_history(
                            request=request,
                            request_id=request_id,
                            correlation_id=correlation_id,
                            received_at=received_at,
                            completed_at=completed_at,
                            request_size=request_size,
                            response_size=response_bytes,
                            final_status_code=upstream.status_code,
                            total_duration_ms=total_duration,
                            final_backend_id=backend.id,
                            attempts=attempts,
                            outcome="internal_error" if stream_error else (
                                "upstream_error" if upstream.status_code >= 500 else "success"
                            ),
                            error_type=type(stream_error).__name__ if stream_error else None,
                            error_code="RESPONSE_STREAM_ERROR" if stream_error else None,
                            error_message=str(stream_error) if stream_error else None,
                        )

                return StreamingResponse(
                    stream(),
                    status_code=upstream.status_code,
                    headers=response_headers,
                    media_type=None,
                )
            except RequestBodyTooLargeError as exc:
                completed_at = datetime.now(timezone.utc)
                duration = (time.perf_counter() - attempt_started) * 1000
                await self.registry.release(backend.id, error=True, latency_ms=duration)
                attempts.append(self._failed_attempt(
                    attempt_index, backend.id, attempt_started_at, completed_at,
                    duration, "request_body_too_large", exc, False,
                ))
                self._publish_event(
                    "attempt_failed",
                    request=request,
                    request_id=request_id,
                    correlation_id=correlation_id,
                    backend_id=backend.id,
                    attempt_number=attempt_index + 1,
                    algorithm=self.router.algorithm_name.value,
                    phase="error",
                    status_code=413,
                    duration_ms=round(duration, 3),
                    error_type=type(exc).__name__,
                    error_message=str(exc),
                )
                self._submit_history(
                    request=request,
                    request_id=request_id,
                    correlation_id=correlation_id,
                    received_at=received_at,
                    completed_at=completed_at,
                    request_size=request_size,
                    response_size=None,
                    final_status_code=413,
                    total_duration_ms=(time.perf_counter() - total_started) * 1000,
                    final_backend_id=backend.id,
                    attempts=attempts,
                    outcome="rejected",
                    error_type=type(exc).__name__,
                    error_code="REQUEST_BODY_TOO_LARGE",
                    error_message="Request body exceeds configured limit",
                )
                raise HTTPException(status_code=413, detail="Request body exceeds configured limit")
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
                last_error = exc
                completed_at = datetime.now(timezone.utc)
                duration = (time.perf_counter() - attempt_started) * 1000
                await self.registry.release(backend.id, error=True, latency_ms=duration)
                retry_scheduled = attempt_index + 1 < max_attempts
                attempts.append(self._failed_attempt(
                    attempt_index, backend.id, attempt_started_at, completed_at,
                    duration, self._network_outcome(exc), exc, retry_scheduled,
                ))
                self._publish_event(
                    "attempt_failed",
                    request=request,
                    request_id=request_id,
                    correlation_id=correlation_id,
                    backend_id=backend.id,
                    attempt_number=attempt_index + 1,
                    algorithm=self.router.algorithm_name.value,
                    phase="warning" if retry_scheduled else "error",
                    duration_ms=round(duration, 3),
                    retry_scheduled=retry_scheduled,
                    error_type=type(exc).__name__,
                    error_message=str(exc),
                )
                if retry_scheduled:
                    self._publish_event(
                        "retry_scheduled",
                        request=request,
                        request_id=request_id,
                        correlation_id=correlation_id,
                        backend_id=backend.id,
                        attempt_number=attempt_index + 2,
                        algorithm=self.router.algorithm_name.value,
                        phase="pending",
                    )
                if not retry_scheduled:
                    break
            except Exception as exc:
                last_error = exc
                completed_at = datetime.now(timezone.utc)
                duration = (time.perf_counter() - attempt_started) * 1000
                await self.registry.release(backend.id, error=True, latency_ms=duration)
                attempts.append(self._failed_attempt(
                    attempt_index, backend.id, attempt_started_at, completed_at,
                    duration, "internal_error", exc, False,
                ))
                self._publish_event(
                    "attempt_failed",
                    request=request,
                    request_id=request_id,
                    correlation_id=correlation_id,
                    backend_id=backend.id,
                    attempt_number=attempt_index + 1,
                    algorithm=self.router.algorithm_name.value,
                    phase="error",
                    duration_ms=round(duration, 3),
                    error_type=type(exc).__name__,
                    error_message=str(exc),
                )
                break

        completed_at = datetime.now(timezone.utc)
        total_duration = (time.perf_counter() - total_started) * 1000
        error_text = f"{type(last_error).__name__}: {last_error}" if last_error else "no_healthy_backend"
        await self.metrics.record(RequestRecord(
            request_id=request_id,
            timestamp=completed_at.isoformat(),
            method=request.method,
            path=request.url.path,
            backend_id=None,
            status_code=503,
            duration_ms=round(total_duration, 2),
            error=error_text,
            retry_count=max(0, len(attempted) - 1),
        ))
        self._publish_event(
            "backend_unavailable",
            request=request,
            request_id=request_id,
            correlation_id=correlation_id,
            backend_id=None,
            attempt_number=len(attempts),
            algorithm=self.router.algorithm_name.value,
            phase="error",
            status_code=503,
            duration_ms=round(total_duration, 3),
            error_type=type(last_error).__name__ if last_error else "NoHealthyBackendError",
            error_message=error_text,
        )
        self._submit_history(
            request=request,
            request_id=request_id,
            correlation_id=correlation_id,
            received_at=received_at,
            completed_at=completed_at,
            request_size=request_size,
            response_size=None,
            final_status_code=503,
            total_duration_ms=total_duration,
            final_backend_id=None,
            attempts=attempts,
            outcome="no_healthy_backend" if last_error is None else "timeout" if isinstance(last_error, (httpx.ConnectTimeout, httpx.ReadTimeout)) else "upstream_error",
            error_type=type(last_error).__name__ if last_error else "NoHealthyBackendError",
            error_code="NO_BACKEND_AVAILABLE",
            error_message=error_text,
        )
        raise HTTPException(status_code=503, detail="No backend could serve the request")

    def _submit_history(
        self,
        *,
        request: Request,
        request_id: str,
        correlation_id: str,
        received_at: datetime,
        completed_at: datetime,
        request_size: int | None,
        response_size: int | None,
        final_status_code: int,
        total_duration_ms: float,
        final_backend_id: str | None,
        attempts: list[dict],
        outcome: str,
        error_type: str | None,
        error_code: str | None,
        error_message: str | None,
    ) -> None:
        if self.history_worker is None:
            return
        self.history_worker.submit({
            "request": {
                "request_id": request_id,
                "correlation_id": correlation_id,
                "received_at": received_at.isoformat(),
                "completed_at": completed_at.isoformat(),
                "http_method": request.method,
                "route": request.url.path,
                "query_present": bool(request.url.query),
                "request_size_bytes": request_size,
                "response_size_bytes": response_size,
                "final_status_code": final_status_code,
                "total_duration_ms": round(total_duration_ms, 3),
                "selected_algorithm": self.router.algorithm_name.value,
                "final_backend_id": final_backend_id,
                "attempt_count": len(attempts),
                "retry_count": max(0, len(attempts) - 1),
                "outcome": outcome,
                "error_type": error_type,
                "error_code": error_code,
                "error_message": error_message,
                "client_ip": None,
                "client_ip_hash": None,
                "user_agent_family": self._user_agent_family(request.headers.get("user-agent", "")),
                "metadata": {},
            },
            "attempts": list(attempts),
        })

    def _publish_event(
        self,
        event_type: str,
        *,
        request: Request,
        request_id: str,
        correlation_id: str,
        backend_id: str | None,
        attempt_number: int | None,
        algorithm: str | None,
        phase: str,
        status_code: int | None = None,
        duration_ms: float | None = None,
        retry_scheduled: bool | None = None,
        error_type: str | None = None,
        error_message: str | None = None,
    ) -> None:
        if self.event_hub is None:
            return
        self.event_hub.publish({
            "event_type": event_type,
            "request_id": request_id,
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "phase": phase,
            "backend_id": backend_id,
            "attempt_number": attempt_number,
            "algorithm": algorithm,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "retry_scheduled": retry_scheduled,
            "error_type": error_type,
            "error_message": error_message,
        })

    def _failed_attempt(
        self,
        attempt_index: int,
        backend_id: str,
        started_at: datetime,
        completed_at: datetime,
        duration_ms: float,
        outcome: str,
        exc: Exception,
        retry_scheduled: bool,
    ) -> dict:
        return {
            "attempt_number": attempt_index + 1,
            "backend_id": backend_id,
            "selected_algorithm": self.router.algorithm_name.value,
            "started_at": started_at.isoformat(),
            "completed_at": completed_at.isoformat(),
            "duration_ms": round(duration_ms, 3),
            "upstream_status_code": None,
            "outcome": outcome,
            "retryable": retry_scheduled,
            "retry_scheduled": retry_scheduled,
            "error_type": type(exc).__name__,
            "error_code": outcome.upper(),
            "error_message": str(exc),
            "metadata": {},
        }

    @staticmethod
    def _network_outcome(exc: Exception) -> str:
        if isinstance(exc, httpx.ConnectTimeout):
            return "connect_timeout"
        if isinstance(exc, httpx.ReadTimeout):
            return "read_timeout"
        return "connect_error"

    async def _limited_body(self, request: Request) -> AsyncIterator[bytes]:
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > self.settings.max_request_body_bytes:
                raise RequestBodyTooLargeError
            yield chunk

    @staticmethod
    def _request_headers(request: Request, request_id: str, correlation_id: str) -> dict[str, str]:
        headers = {
            key: value for key, value in request.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS | {"host", "content-length"}
        }
        client_ip = request.client.host if request.client else "unknown"
        prior = request.headers.get("x-forwarded-for")
        headers["x-forwarded-for"] = f"{prior}, {client_ip}" if prior else client_ip
        headers["x-forwarded-host"] = request.headers.get("host", "")
        headers["x-forwarded-proto"] = request.url.scheme
        headers["x-request-id"] = request_id
        headers["x-correlation-id"] = correlation_id
        return headers

    @staticmethod
    def _response_headers(response: httpx.Response) -> dict[str, str]:
        return {
            key: value for key, value in response.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS | {"content-length", "content-encoding"}
        }

    @staticmethod
    def _user_agent_family(user_agent: str) -> str | None:
        lowered = user_agent.lower()
        for name in ("chrome", "firefox", "safari", "edge", "curl", "postman"):
            if name in lowered:
                return name
        return "other" if user_agent else None
