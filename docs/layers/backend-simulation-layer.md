# Backend Simulation Layer

## Purpose

Provide controlled backend profiles for routing, latency, and failure testing.

| Service | Port | Behavior |
|---|---:|---|
| `backend-fast` | `9001` | Low latency and stable |
| `backend-slow` | `9002` | High latency and stable |
| `backend-unstable` | `9003` | Intermittent failures |

## Main files

```text
test-backends/
├── app.py
├── Dockerfile
└── requirements.txt
```

## Environment values

```env
BACKEND_NAME=backend-fast
RESPONSE_DELAY_MS=20
FAILURE_RATE=0
```
