# Design Decisions

## Docker Compose

Used for reproducible startup, service DNS, health checks, and isolated networking.

## FastAPI

Chosen for asynchronous HTTP handling, typed validation, and automatic OpenAPI documentation.

## Angular

Provides structured components for monitoring tables, status indicators, controls, and charts.

## In-memory state

Keeps the demonstration simple. It is not appropriate for durable history or multi-instance routing state.

## Simulated backends

The fast, slow, and unstable profiles create controlled test conditions without depending on external services.

## Branch accuracy

Documentation must match the current `docker-compose.yml`. Services absent from the active branch must not be presented as running components.
