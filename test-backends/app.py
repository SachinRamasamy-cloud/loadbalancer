import asyncio
import os
import random
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Load Balancer Test Backend")

BACKEND_NAME = os.getenv("BACKEND_NAME", "test-backend")
RESPONSE_DELAY_MS = int(os.getenv("RESPONSE_DELAY_MS", "0"))
FAILURE_RATE = float(os.getenv("FAILURE_RATE", "0"))
HEALTH_FAILURE = os.getenv("HEALTH_FAILURE", "false").lower() == "true"


@app.get("/health")
async def health():
    if HEALTH_FAILURE:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "backend": BACKEND_NAME,
            },
        )

    return {
        "status": "healthy",
        "backend": BACKEND_NAME,
    }


@app.api_route(
    "/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
)
async def handle_request(path: str, request: Request):
    if RESPONSE_DELAY_MS > 0:
        await asyncio.sleep(RESPONSE_DELAY_MS / 1000)

    if random.random() < FAILURE_RATE:
        return JSONResponse(
            status_code=500,
            content={
                "status": "failed",
                "backend": BACKEND_NAME,
                "path": f"/{path}",
                "message": "Simulated application failure",
            },
        )

    body = await request.body()

    return {
        "status": "success",
        "backend": BACKEND_NAME,
        "method": request.method,
        "path": f"/{path}",
        "body_size": len(body),
        "delay_ms": RESPONSE_DELAY_MS,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
