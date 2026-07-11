# LoadFlow Balancer Documentation

This directory contains the complete technical documentation for **LoadFlow Balancer**, a Dockerized FastAPI and Angular system that demonstrates health-aware request routing across multiple backend services.

## Current branch services

| Service | Role | Port |
|---|---|---:|
| `dashboard` | Angular monitoring dashboard | `4200` |
| `load-balancer` | FastAPI reverse proxy and routing engine | `8080` |
| `backend-fast` | Low-latency healthy backend | `9001` internal |
| `backend-slow` | High-latency healthy backend | `9002` internal |
| `backend-unstable` | Intermittently failing backend | `9003` internal |

The current branch does not define `backend-failure`.

## Documentation map

- [Architecture](architecture/README.md)
- [Layers](layers/README.md)
- [Setup](setup/local-setup.md)
- [Development](development/backend-development.md)
- [Operations](operations/startup-and-shutdown.md)
- [Runbooks](runbooks/service-will-not-start.md)
- [Security](security/threat-model.md)
- [Reference](reference/ports-and-services.md)
- [Onboarding](onboarding/first-day-setup.md)
