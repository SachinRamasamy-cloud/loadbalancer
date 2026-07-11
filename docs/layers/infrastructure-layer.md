# Infrastructure Layer

## Purpose

Run, connect, and isolate all services.

## Components

- Docker Engine
- Docker Compose
- Docker bridge network
- Service DNS
- Container health checks
- Environment files

## Internal URLs

```text
http://backend-fast:9001
http://backend-slow:9002
http://backend-unstable:9003
```

## External URLs

```text
http://localhost:4200
http://localhost:8080
```

## Common failures

- Missing Dockerfile
- Wrong build context
- Orphan containers after branch changes
- `.env` referencing absent services
