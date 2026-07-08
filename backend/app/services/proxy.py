from __future__ import annotations

import time
import uuid
from collections.abc import AsyncIterator
from urllib.parse import urljoin

import httpx
from fastapi import HTTPException, Request, status
from starlette.responses import StreamingResponse

from app.core.config import Settings
from app.domain.errors import NoHealthyBackendError, RequestBodyTooLargeError
from app.services.metrics import MetricsStore, RequestRecord
from app.services.registry import BackendRegistry
from app.services.router import TrafficRouter

HOP_BY_HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te",
    "trailers", "transfer-encoding", "upgrade",
}
SAFE_RETRY_METHODS = {"GET", "HEAD", "OPTIONS"}


class ProxyService:
    def __init__(self, *, client: httpx.AsyncClient, registry: BackendRegistry, router: TrafficRouter,
                 metrics: MetricsStore, settings: Settings) -> None:
        self.client = client
        self.registry = registry
        self.router = router
        self.metrics = metrics
        self.settings = settings

    async def forward(self, request: Request, path: str) -> StreamingResponse:
        if request.method == "CONNECT":
            raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail="CONNECT is disabled")

        declared_length = request.headers.get("content-length")
        if declared_length:
            try:
                content_length = int(declared_length)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid Content-Length header") from exc
            if content_length < 0:
                raise HTTPException(status_code=400, detail="Invalid Content-Length header")
            if content_length > self.settings.max_request_body_bytes:
                raise HTTPException(status_code=413, detail="Request body exceeds configured limit")

        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        attempted: set[str] = set()
        max_attempts = 2 if request.method in SAFE_RETRY_METHODS else 1
        last_error: Exception | None = None

        for attempt in range(max_attempts):
            try:
                backend = await self.router.select(attempted)
            except NoHealthyBackendError:
                break
            attempted.add(backend.id)
            await self.registry.acquire(backend.id)
            started = time.perf_counter()
            try:
                target = f"{backend.url}/{path.lstrip('/')}"
                if request.url.query:
                    target = f"{target}?{request.url.query}"
                headers = self._request_headers(request, request_id)
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

                async def stream() -> AsyncIterator[bytes]:
                    error = False
                    try:
                        async for chunk in upstream.aiter_bytes():
                            yield chunk
                    except Exception:
                        error = True
                        raise
                    finally:
                        await upstream.aclose()
                        duration = (time.perf_counter() - started) * 1000
                        await self.registry.release(backend.id, error=error or upstream.status_code >= 500,
                                                    latency_ms=duration)
                        await self.metrics.record(RequestRecord(
                            request_id=request_id,
                            timestamp=_utc_iso(),
                            method=request.method,
                            path=request.url.path,
                            backend_id=backend.id,
                            status_code=upstream.status_code,
                            duration_ms=round(duration, 2),
                            error="response_stream_error" if error else None,
                            retry_count=attempt,
                        ))

                return StreamingResponse(
                    stream(),
                    status_code=upstream.status_code,
                    headers=response_headers,
                    media_type=None,
                )
            except RequestBodyTooLargeError:
                await self.registry.release(backend.id, error=True)
                raise HTTPException(status_code=413, detail="Request body exceeds configured limit")
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as exc:
                last_error = exc
                duration = (time.perf_counter() - started) * 1000
                await self.registry.release(backend.id, error=True, latency_ms=duration)
                if attempt + 1 >= max_attempts:
                    break
            except Exception as exc:
                last_error = exc
                duration = (time.perf_counter() - started) * 1000
                await self.registry.release(backend.id, error=True, latency_ms=duration)
                break

        await self.metrics.record(RequestRecord(
            request_id=request_id,
            timestamp=_utc_iso(),
            method=request.method,
            path=request.url.path,
            backend_id=None,
            status_code=503,
            duration_ms=0,
            error=f"{type(last_error).__name__}: {last_error}" if last_error else "no_healthy_backend",
            retry_count=max(0, len(attempted) - 1),
        ))
        raise HTTPException(status_code=503, detail="No backend could serve the request")

    async def _limited_body(self, request: Request) -> AsyncIterator[bytes]:
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > self.settings.max_request_body_bytes:
                raise RequestBodyTooLargeError
            yield chunk

    @staticmethod
    def _request_headers(request: Request, request_id: str) -> dict[str, str]:
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
        return headers

    @staticmethod
    def _response_headers(response: httpx.Response) -> dict[str, str]:
        return {
            key: value for key, value in response.headers.items()
            if key.lower() not in HOP_BY_HOP_HEADERS | {"content-length", "content-encoding"}
        }


def _utc_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()
