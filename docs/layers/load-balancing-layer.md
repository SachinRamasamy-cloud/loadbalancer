# Load-Balancing Layer

## Purpose

Select an eligible backend for each request.

## Responsibilities

- Read the healthy backend pool
- Apply the configured algorithm
- Respect weights
- Track routing state
- Trigger failover
- Update counters

## Round Robin

Sequentially rotates across healthy backends.

## Weighted Round Robin

For weights `3:1:1`, the long-run target is approximately `60%:20%:20%`.

## Pitfalls

- Race conditions in shared counters
- Incorrect weight handling
- Selecting stale unhealthy backends
- Unbounded retries
