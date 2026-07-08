# Engineering Load Balancer

A runnable Layer-7 HTTP load balancer built with **FastAPI + HTTPX**, with a simple **Angular** operations dashboard.

## Included

- Round Robin, Smooth Weighted Round Robin, and Least In-Flight routing
- Active health checks with recovery/failure thresholds
- Passive failure tracking and safe retry for idempotent requests
- Request/response streaming through HTTPX
- Request size limits and hop-by-hop header filtering
- Admin API key protection
- Per-IP fixed-window rate limiting
- Backend enable, disable, drain, and weight management
- Request metrics, latency percentiles, time-series data, and recent logs
- Angular dashboard with overview cards, charts, backend table, and control actions
- Dummy fast, slow, and unstable backend services
- Docker Compose development stack
- Backend unit and integration tests

## Architecture

```text
Browser / API Client
        |
        v
FastAPI Load Balancer :8080
  |-- Control API /api/control/* (API-key protected)
  |-- Proxy catch-all /*
  |-- Health checker
  |-- Metrics and logs
        |
        +--> backend-fast :9001
        +--> backend-slow :9002
        +--> backend-unstable :9003

Angular Dashboard :4200 --> /api/control/*
```

## Run with Docker

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Dashboard: http://localhost:4200
- Load balancer: http://localhost:8080
- API docs: http://localhost:8080/docs

Try traffic:

```bash
curl http://localhost:8080/api/demo
curl http://localhost:8080/api/demo
curl http://localhost:8080/api/demo
```

Control API:

```bash
curl -H 'X-Admin-API-Key: change-me' \
  http://localhost:8080/api/control/backends
```

## Run backend tests locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest -q
```

## Security defaults

The example `.env` uses development-friendly settings. Before external deployment:

1. Replace `ADMIN_API_KEY` with a long random secret.
2. Set `ALLOW_PRIVATE_BACKENDS=false` and configure `ALLOWED_BACKEND_HOSTS`.
3. Put TLS termination in front of the service.
4. Restrict dashboard/control API network access.
5. Move runtime configuration and metrics to durable/shared stores when running multiple balancer instances.

See [docs/SECURITY.md](docs/SECURITY.md) and [docs/EDGE_CASES.md](docs/EDGE_CASES.md).
