# Environment Configuration

```env
ALLOWED_BACKEND_HOSTS=backend-fast,backend-slow,backend-unstable
```

```env
SEED_BACKENDS_JSON=[{"id":"fast","name":"Fast API","url":"http://backend-fast:9001","weight":3},{"id":"slow","name":"Slow API","url":"http://backend-slow:9002","weight":1},{"id":"unstable","name":"Unstable API","url":"http://backend-unstable:9003","weight":1}]
```

Keep `SEED_BACKENDS_JSON` on one complete line in `.env`.
