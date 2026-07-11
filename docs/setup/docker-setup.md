# Docker Setup

## Validate

```bash
docker compose config
docker compose config --services
```

Expected services:

```text
backend-fast
backend-slow
backend-unstable
load-balancer
dashboard
```

## Build and start

```bash
docker compose build
docker compose up -d
```

## Stop

```bash
docker compose down
```
