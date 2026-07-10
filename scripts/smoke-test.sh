#!/usr/bin/env sh
set -eu
BASE_URL=${BASE_URL:-http://localhost:8080}
ADMIN_API_KEY=${ADMIN_API_KEY:-change-me}

curl -fsS "$BASE_URL/healthz"
printf '\n'
for i in 1 2 3 4 5; do curl -fsS "$BASE_URL/api/demo"; printf '\n'; done
curl -fsS -H "X-Admin-API-Key: $ADMIN_API_KEY" "$BASE_URL/api/control/overview"
printf '\n'
