# Adding a Backend

1. Add a service to `docker-compose.yml`.
2. Set `BACKEND_NAME`, `RESPONSE_DELAY_MS`, and `FAILURE_RATE`.
3. Add the hostname to `ALLOWED_BACKEND_HOSTS`.
4. Add it to `SEED_BACKENDS_JSON`.
5. Validate Compose.
6. Rebuild and start.
7. Verify health and traffic distribution.

```yaml
backend-medium:
  build:
    context: ./test-backends
  environment:
    BACKEND_NAME: backend-medium
    RESPONSE_DELAY_MS: 250
    FAILURE_RATE: 0.05
```
