from __future__ import annotations

import time
import uuid
from typing import Any

from app.services.live_api_events import LiveApiEventHub


class ApiEventMiddleware:
    """Publish lifecycle events for every HTTP request received by FastAPI.

    This is a pure ASGI middleware, so it observes normal JSON responses and
    streamed proxy responses without buffering response bodies.
    """

    def __init__(self, app: Any, event_hub: LiveApiEventHub) -> None:
        self.app = app
        self.event_hub = event_hub

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") != "http" or not self.event_hub.enabled:
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        if path in {
            "/api/control/events/stream",
            "/api/control/events/recent",
        }:
            await self.app(scope, receive, send)
            return

        headers = list(scope.get("headers", []))
        header_map = {
            key.decode("latin-1").lower(): value.decode("latin-1")
            for key, value in headers
        }
        request_id = header_map.get("x-request-id") or str(uuid.uuid4())
        correlation_id = header_map.get("x-correlation-id") or request_id

        if "x-request-id" not in header_map:
            headers.append((b"x-request-id", request_id.encode("latin-1")))
        if "x-correlation-id" not in header_map:
            headers.append((b"x-correlation-id", correlation_id.encode("latin-1")))
        scope["headers"] = headers

        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        state["correlation_id"] = correlation_id

        method = scope.get("method", "GET")
        client = scope.get("client")
        client_ip = client[0] if client else None
        user_agent = header_map.get("user-agent", "")
        started = time.perf_counter()
        response_status: int | None = None
        selected_backend: str | None = None
        completed = False

        self.event_hub.publish({
            "event_type": "request_received",
            "request_id": request_id,
            "correlation_id": correlation_id,
            "method": method,
            "path": path,
            "phase": "pending",
            "client_ip": client_ip,
            "client_name": self._client_name(user_agent),
        })

        async def send_wrapper(message: dict) -> None:
            nonlocal response_status, selected_backend, completed

            if message.get("type") == "http.response.start":
                response_status = int(message.get("status", 200))
                response_headers = list(message.get("headers", []))
                response_header_map = {
                    key.decode("latin-1").lower(): value.decode("latin-1")
                    for key, value in response_headers
                }
                selected_backend = (
                    response_header_map.get("x-selected-backend")
                    or response_header_map.get("x-backend-id")
                    or response_header_map.get("x-upstream-backend")
                )
                if "x-request-id" not in response_header_map:
                    response_headers.append(
                        (b"x-request-id", request_id.encode("latin-1"))
                    )
                if "x-correlation-id" not in response_header_map:
                    response_headers.append(
                        (b"x-correlation-id", correlation_id.encode("latin-1"))
                    )
                message["headers"] = response_headers

            if (
                message.get("type") == "http.response.body"
                and not message.get("more_body", False)
                and not completed
            ):
                completed = True
                duration_ms = (time.perf_counter() - started) * 1000
                status_code = response_status or 200
                self.event_hub.publish({
                    "event_type": "request_completed",
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "method": method,
                    "path": path,
                    "phase": "error" if status_code >= 400 else "success",
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 3),
                    "backend_id": selected_backend,
                    "client_ip": client_ip,
                    "client_name": self._client_name(user_agent),
                })

            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            if not completed:
                duration_ms = (time.perf_counter() - started) * 1000
                self.event_hub.publish({
                    "event_type": "request_failed",
                    "request_id": request_id,
                    "correlation_id": correlation_id,
                    "method": method,
                    "path": path,
                    "phase": "error",
                    "status_code": response_status or 500,
                    "duration_ms": round(duration_ms, 3),
                    "backend_id": selected_backend,
                    "error_type": type(exc).__name__,
                    "error_message": str(exc),
                    "client_ip": client_ip,
                    "client_name": self._client_name(user_agent),
                })
            raise

    @staticmethod
    def _client_name(user_agent: str) -> str:
        lowered = user_agent.lower()
        for marker, label in (
            ("curl", "curl"),
            ("postman", "Postman"),
            ("insomnia", "Insomnia"),
            ("chrome", "Chrome"),
            ("firefox", "Firefox"),
            ("safari", "Safari"),
            ("edge", "Edge"),
            ("python", "Python client"),
        ):
            if marker in lowered:
                return label
        return "HTTP client"
