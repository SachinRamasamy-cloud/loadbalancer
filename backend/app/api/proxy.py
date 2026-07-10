from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def proxy(path: str, request: Request):
    container = request.app.state.container
    client_ip = request.client.host if request.client else "unknown"

    # Detect SQL Injection
    query_str = str(request.query_params).lower()
    path_lower = path.lower()
    is_suspicious = False
    susp_reason = ""
    if any(k in path_lower or k in query_str for k in ["union select", "select ", "1=1", "or ", "drop table", "alter table"]):
        is_suspicious = True
        susp_reason = "SQL injection attempt detected"

    # Detect suspicious User Agent
    ua = request.headers.get("user-agent", "").lower()
    if any(k in ua for k in ["sqlmap", "nikto", "nmap"]):
        is_suspicious = True
        susp_reason = "Suspicious user agent blocked"

    if is_suspicious:
        await container.security_store.record_suspicious_event(susp_reason, client_ip)
        raise HTTPException(status_code=400, detail=f"Request blocked due to suspicious activity: {susp_reason}")

    allowed, remaining = await container.rate_limiter.allow(client_ip)
    if not allowed:
        await container.security_store.record_rate_limit(client_ip)
        raise HTTPException(status_code=429, detail="Rate limit exceeded", headers={"Retry-After": str(container.settings.rate_limit_window_seconds)})

    response = await container.proxy.forward(request, path)
    response.headers["x-rate-limit-remaining"] = str(remaining)
    return response
