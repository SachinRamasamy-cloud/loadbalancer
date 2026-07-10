# Security Review

Implemented controls:

- Constant-time admin API key comparison
- Control API separated under `/api/control`
- Backend URL scheme, userinfo, host allowlist, and private-address validation
- `CONNECT` method disabled
- Hop-by-hop headers removed in both directions
- Backend redirects disabled
- Request body limit enforced from `Content-Length` and streaming byte count
- Rate limiting by client IP
- Retry limited to one additional attempt and only for idempotent methods
- CORS origin allowlist
- Error responses do not expose stack traces

Production requirements not solved by this repository alone:

- TLS certificates and internet-facing DDoS protection
- Multi-instance shared state
- Identity-provider login and fine-grained roles
- Audit-log persistence
- Secret manager integration
- Web Application Firewall rules
- mTLS between proxy and internal backends
- WebSocket/gRPC proxy support

Do not expose the development API key or allow arbitrary backend URLs in production.
