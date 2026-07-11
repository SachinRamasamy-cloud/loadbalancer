# Presentation Layer

## Purpose

The Angular dashboard displays backend health, request distribution, latency, error counts, and the active algorithm.

## Responsibilities

- Fetch monitoring data from FastAPI
- Display backend health and metrics
- Show loading, stale, and error states
- Provide supported operator controls

## Interaction

```text
Angular Dashboard -> HTTP/JSON -> FastAPI APIs
```

## Non-functional concerns

- Avoid hardcoded container-local URLs
- Handle API timeouts and partial failures
- Protect administrative controls
- Avoid exposing secrets
- Keep polling frequency reasonable

## Common problems

- CORS failures
- Incorrect Nginx proxy configuration
- Angular build output path mismatch
- Stale UI state after backend changes
