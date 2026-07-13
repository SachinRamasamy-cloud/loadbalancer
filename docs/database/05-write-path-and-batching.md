# 5. Write Path and Batching

## Main requirement

Request routing must not depend on log persistence.

A temporary database outage should reduce telemetry completeness, not stop request forwarding.

## Data criticality

### Class A: Configuration

Examples:

- Backends
- Weights
- Algorithms
- Administrative changes

Use synchronous durable transactions.

### Class B: Request and attempt history

High-value operational history. Prefer durable persistence, but asynchronous batching is acceptable when bounded and monitored.

### Class C: High-frequency telemetry

Examples:

- Health checks
- Per-second metrics
- Pool samples

Batch, sample, aggregate, and retain for limited periods.

### Class D: Debug logs

Keep in the deployment logging platform, not Postgres.

## Recommended first implementation

Use a bounded in-process queue for request history and telemetry:

1. Request finishes.
2. Application creates a structured event.
3. Event enters a bounded queue.
4. Background writer flushes in batches.
5. Transient failures use bounded backoff.
6. Queue overflow increments a dropped-event metric.

Suggested starting behavior:

```text
Flush every 250–500 ms
or
Flush at 100–500 queued events
```

## Durability trade-off

An in-process queue can lose pending events if the container crashes.

Progression:

1. In-process bounded queue
2. Redis Stream or durable message queue
3. Independent telemetry workers with replay and dead-letter handling

## Transaction consistency

A logical request and all its attempts should be written in one transaction where practical.

## Idempotency

Use stable UUIDs for requests, attempts, health checks, and load tests.

## Backpressure

When overloaded:

1. Keep routing.
2. Drop low-value telemetry first.
3. Preserve configuration and audit events.
4. Record dropped-event counts.
5. Expose queue depth.
