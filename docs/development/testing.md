# Testing

```bash
pytest
python3 -m py_compile test-backends/app.py
docker compose config
curl --fail http://localhost:8080/healthz
curl -i http://localhost:8080/api/demo
```

Load test:

```bash
seq 1 1000 | xargs -n1 -P50   curl -s -o /dev/null -w "%{http_code}\n"   http://localhost:8080/api/demo | sort | uniq -c
```
