# Backend Development

## Location

```text
backend/
```

## Workflow

```bash
docker compose up -d --build load-balancer
docker compose logs -f load-balancer
```

## Validation

```bash
pytest
python -m compileall backend/app
```

Use asynchronous I/O, bounded timeouts, connection reuse, and safe shared-state handling.
