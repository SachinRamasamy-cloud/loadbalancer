# System Context

LoadFlow Balancer is a local development and demonstration platform for application-layer load balancing. It receives HTTP requests, selects an available backend using the configured routing policy, forwards the request, records the result, and exposes runtime state through an Angular dashboard.

## External actors

- Web browser users
- Load-testing tools such as `curl`, `xargs`, ApacheBench, or k6
- Developers and operators
- Third-party HTTP clients

## Internal services

- Angular dashboard
- FastAPI load balancer
- Fast backend simulator
- Slow backend simulator
- Unstable backend simulator
- Docker Compose network

## System boundary

The application runs as a Docker Compose stack on a single development host. Backend services communicate using Docker DNS names and do not need direct host port exposure.
