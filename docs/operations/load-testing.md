# Load Testing

## 1,000 requests with 50 concurrent workers

```bash
time seq 1 1000 | xargs -n1 -P50   curl -s -o /dev/null http://localhost:8080/api/demo
```

## Count response codes

```bash
seq 1 1000 | xargs -n1 -P50   curl -s -o /dev/null -w "%{http_code}\n"   http://localhost:8080/api/demo | sort | uniq -c
```

`200` is success, `500` may come from the unstable backend, `429` indicates rate limiting, and `502/504` indicate upstream failures or timeouts.
