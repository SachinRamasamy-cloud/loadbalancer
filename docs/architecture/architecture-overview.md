# Architecture Overview

```mermaid
flowchart TB
    subgraph Clients
        WEB[Web Browser]
        TEST[Load Test Client]
        EXT[Third-Party Client]
    end

    subgraph Docker[Docker Network: lbnet]
        DASH[Angular Dashboard<br/>Host port 4200]

        subgraph LB[FastAPI Load Balancer :8080]
            ROUTES[API and Proxy Routes]
            ENGINE[Load-Balancing Engine]
            REGISTRY[Backend Registry]
            HEALTH[Health Checker]
            RETRY[Retry and Failover]
            METRICS[Metrics Collector]
            STATE[In-Memory State]
        end

        FAST[backend-fast<br/>9001]
        SLOW[backend-slow<br/>9002]
        UNSTABLE[backend-unstable<br/>9003]
    end

    WEB --> DASH
    WEB --> ROUTES
    TEST --> ROUTES
    EXT --> ROUTES
    DASH --> ROUTES
    ROUTES --> ENGINE
    ENGINE --> REGISTRY
    ENGINE --> HEALTH
    ENGINE --> RETRY
    ENGINE --> METRICS
    METRICS --> STATE
    ENGINE --> FAST
    ENGINE --> SLOW
    ENGINE --> UNSTABLE
    HEALTH --> FAST
    HEALTH --> SLOW
    HEALTH --> UNSTABLE
```

## Architectural characteristics

- Containerized local deployment
- HTTP reverse-proxy behavior
- Health-aware backend selection
- Configurable routing algorithm
- Runtime metrics collection
- Simulated latency and failures
- Angular operational dashboard
