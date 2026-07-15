from __future__ import annotations

import hmac
import logging

from fastapi import Header, HTTPException, Request, status

logger = logging.getLogger(__name__)


async def require_admin_key(
    request: Request,
    x_admin_api_key: str | None = Header(default=None),
) -> None:
    """Validate the admin key without allowing audit-storage failures to become HTTP 500.

    Authentication must return 401 for an invalid key even when Supabase or the
    security-event repository is temporarily unavailable.
    """

    expected = request.app.state.container.settings.admin_api_key
    valid = bool(x_admin_api_key) and hmac.compare_digest(x_admin_api_key, expected)
    if valid:
        return

    client_ip = request.client.host if request.client else "unknown"
    try:
        await request.app.state.container.security_store.record_auth_failure(client_ip)
    except Exception:
        logger.exception(
            "Unable to persist authentication failure for client %s",
            client_ip,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid admin API key",
    )
