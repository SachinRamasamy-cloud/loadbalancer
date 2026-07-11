# State and Metrics Layer

## Purpose

Store runtime backend state and request metrics.

## Current in-memory state

- Backend registry
- Health state
- Request counts
- Failure counts
- Latency values
- Algorithm state

## Limitations

- State is lost on restart
- Replicas do not share state
- Historical trends are limited
- Dashboard history resets after redeployment

## Future options

| Requirement | Technology |
|---|---|
| Shared runtime state | Redis |
| Historical metrics | Prometheus |
| Visualization | Grafana |
| Persistent configuration | PostgreSQL |
