# Validation Report

Validation date: 8 July 2026

## Backend automated tests

Command:

```bash
cd backend
pytest -q
```

Result:

```text
10 passed
```

Coverage areas:

- Round-robin ordering
- Smooth weighted distribution
- Least in-flight capacity scoring
- Admin API authentication
- Backend creation and disable behavior
- Backend host allowlist enforcement
- Proxy forwarding
- No-backend `503` behavior
- Request body size enforcement
- Health threshold transitions

## Python compile validation

```text
python -m compileall app tests
```

Result: passed.

## Angular production build

```bash
cd dashboard
npm install
npm run build
```

Result: passed with Angular 21 and TypeScript 5.9.

Generated initial bundle:

```text
main.js     204.37 kB raw / 56.98 kB estimated transfer
styles.css  221 bytes
```

## Live network smoke test

Three local FastAPI backend processes and the load balancer were started on separate ports. Six requests produced this routing order:

```text
fast
slow
stable
fast
slow
stable
```

Control-plane result:

```json
{
  "total_requests": 6,
  "error_rate": 0.0,
  "backend_distribution": {"fast": 2, "slow": 2, "stable": 2},
  "healthy_backends": 3,
  "unhealthy_backends": 0,
  "active_requests": 0,
  "algorithm": "round_robin"
}
```

## Docker note

The Docker Compose file is included, but Docker itself was not installed in the artifact-generation environment, so `docker compose up` could not be executed here. The Python services, real HTTP forwarding, tests, and Angular build were validated independently.
