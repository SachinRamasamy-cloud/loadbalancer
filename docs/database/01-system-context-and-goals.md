# 1. System Context and Goals

## Current system

LoadFlow contains:

- Angular monitoring dashboard
- FastAPI load-balancer API
- Fast, slow, and unstable backend simulators
- Health-aware request routing
- Round Robin and Weighted Round Robin algorithms
- Retry and failover behavior
- Docker-based local development
- Concurrent load testing

## Persistence objective

Supabase Postgres will become the durable system of record for operational history that is currently held only in memory.

The database should preserve:

- Backend definitions and configuration
- Load-balancing algorithm configuration
- Incoming API request history
- Every backend attempt made for a request
- Retry and failover history
- Backend health-check history
- Backend state transitions
- Load-test runs and aggregate results
- Administrative changes
- Structured warning and error events
- Connection-pool health samples

## Design principles

1. The load-balancing path must remain fast.
2. Database failure must not stop request routing.
3. A logical API request and its backend attempts must be modeled separately.
4. Sensitive request data must not be persisted by default.
5. High-volume event tables require retention limits.
6. The application must not create an uncontrolled number of database connections.
7. Schema changes must be applied through versioned migrations.
8. Frontend access should initially go through FastAPI rather than direct database access.

## Non-goals for the first database phase

- Storing full request bodies
- Storing authorization headers or cookies
- Using Postgres as a raw text log warehouse
- Real-time distributed coordination between multiple load-balancer replicas
- Long-term metrics warehousing
