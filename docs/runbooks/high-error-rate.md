# Runbook: High Error Rate

1. Count HTTP status codes.
2. Identify the failing backend.
3. Inspect unstable backend settings.
4. Check timeout and retry configuration.
5. Verify health-check behavior.

```bash
seq 1 1000 | xargs -n1 -P50   curl -s -o /dev/null -w "%{http_code}\n"   http://localhost:8080/api/demo | sort | uniq -c
```
