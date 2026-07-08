# Architecture

## Request plane

`ProxyService` is responsible only for forwarding client traffic. It receives an eligible backend from `TrafficRouter`, streams the request through a shared `httpx.AsyncClient`, sanitizes hop-by-hop headers, and streams the upstream response back to the caller.

## Control plane

`/api/control/*` provides operational APIs for the Angular dashboard. It is separated from the proxy route and protected by an admin API key.

## Backend eligibility

A backend must satisfy all three conditions before an algorithm can select it:

```text
enabled == true
status in {healthy, unknown}
status != draining
```

Active health checks eventually move `unknown` nodes to `healthy` or `unhealthy`. `unknown` is temporarily eligible to prevent startup deadlock before the first threshold is completed.

## Algorithms

- **Round Robin:** predictable, equal rotation.
- **Smooth Weighted Round Robin:** proportional capacity without bursty repeated lists.
- **Least In-Flight:** chooses the lowest `active_requests / weight` score.

## State model

This first release intentionally keeps registry, rate limits, metrics, and logs in process. That keeps the project easy to run and makes algorithm behavior visible. Before running multiple load-balancer replicas, move shared control state to PostgreSQL/Redis or introduce a dedicated control-plane service.
