from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request):
    container = request.app.state.container
    client_ip = request.client.host if request.client else "unknown"
    allowed, remaining = await container.rate_limiter.allow(client_ip)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded", headers={"Retry-After": str(container.settings.rate_limit_window_seconds)})
    response = await container.proxy.forward(request, path)
    response.headers["x-rate-limit-remaining"] = str(remaining)
    return response
