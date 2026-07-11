# Health Checks

```bash
curl http://localhost:8080/healthz
docker compose ps
```

Check a backend from inside the Docker network:

```bash
docker compose exec load-balancer   python -c "import urllib.request; print(urllib.request.urlopen('http://backend-fast:9001/health').read().decode())"
```
