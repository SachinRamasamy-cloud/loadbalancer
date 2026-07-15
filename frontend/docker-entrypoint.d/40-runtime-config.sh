#!/bin/sh
set -eu

API_URL="${LOADFLOW_API_URL:-http://localhost:8080}"
API_KEY="${LOADFLOW_API_KEY:-change-me}"

cat > /usr/share/nginx/html/runtime-config.js <<CONFIG
window.__LOADFLOW_CONFIG__ = {
  apiUrl: '${API_URL}',
  apiKey: '${API_KEY}'
};
CONFIG
