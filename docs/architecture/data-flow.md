# Data Flow

## Request model

```json
{
  "method": "GET",
  "path": "/api/demo",
  "headers": {"accept": "application/json"}
}
```

## Backend model

```json
{
  "id": "fast",
  "name": "Fast API",
  "url": "http://backend-fast:9001",
  "weight": 3,
  "healthy": true
}
```

## Metrics model

```json
{
  "backend_id": "fast",
  "request_count": 1000,
  "failure_count": 3,
  "average_latency_ms": 26.4,
  "last_updated_at": "2026-07-11T18:30:00Z"
}
```

Configuration enters through `.env` and Docker Compose. Runtime state remains in memory unless replaced with an external store.
