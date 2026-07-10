from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, Request, status


async def require_admin_key(request: Request, x_admin_api_key: str | None = Header(default=None)) -> None:
    expected = request.app.state.container.settings.admin_api_key
    if not x_admin_api_key or not hmac.compare_digest(x_admin_api_key, expected):
        client_ip = request.client.host if request.client else "unknown"
        await request.app.state.container.security_store.record_auth_failure(client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin API key")
