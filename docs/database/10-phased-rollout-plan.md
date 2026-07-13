# 10. Phased Rollout Plan

## Phase 0 — Design approval

Confirm:

- Data domains
- Deployment topology
- Connection mode
- Retention
- Authentication model

## Phase 1 — Database foundation

Deliver:

- Async SQLAlchemy engine
- Session factory
- Alembic
- Runtime and migration URLs
- Pool metrics
- Minimal configuration persistence

## Phase 2 — Request and attempt history

Deliver:

- Logical request persistence
- Attempt persistence
- Correlation IDs
- Retry and failover history
- Request-history API

## Phase 3 — Health and operational events

Deliver:

- Health history
- Backend state transitions
- Structured system events
- Audit events

## Phase 4 — Batched telemetry writer

Deliver:

- Bounded queue
- Batch writer
- Backpressure policy
- Dropped-event metrics
- Database outage recovery

## Phase 5 — Dashboard history

Deliver:

- Historical charts
- Request-attempt drill-down
- Load-test history
- Backend availability
- Pool health

## Phase 6 — Scale and hardening

Potential work:

- Redis Stream
- Independent writer workers
- Partitioned tables
- Prometheus/Grafana
- Least-privileged roles
- RLS
- Multi-replica deployment
