# Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant L as FastAPI Load Balancer
    participant E as Routing Engine
    participant H as Health State
    participant B as Selected Backend
    participant M as Metrics Collector

    C->>L: HTTP request
    L->>E: Select backend
    E->>H: Read healthy backends
    H-->>E: Healthy backend list
    E-->>L: Selected backend
    L->>B: Forward request

    alt Backend succeeds
        B-->>L: 2xx response
        L->>M: Record success and latency
        L-->>C: Return response
    else Backend fails
        B-->>L: Error or timeout
        L->>M: Record failure
        L->>E: Request failover backend
        E-->>L: Alternative backend
        L->>B: Retry when policy allows
        L-->>C: Return final response
    end
```

## Steps

1. Client calls port `8080`.
2. FastAPI validates the request.
3. The routing engine reads healthy backends.
4. The active algorithm selects one backend.
5. The request is forwarded.
6. Status and latency are recorded.
7. The response is returned.
8. The dashboard reads aggregated state.
