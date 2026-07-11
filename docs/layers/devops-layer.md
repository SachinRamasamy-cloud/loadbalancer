# DevOps and Delivery Layer

## Purpose

Define build, test, startup, and validation workflows.

## Local lifecycle

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f
```

## Recommended CI stages

1. Python lint and tests
2. Angular lint and tests
3. Docker builds
4. Integration smoke tests
5. Image security scanning
