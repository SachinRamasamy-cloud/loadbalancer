# API Security

- Authenticate administrative routes
- Validate backend hostnames and ports
- Limit request body size
- Remove hop-by-hop headers
- Apply rate limiting
- Avoid exposing stack traces
- Add request IDs
- Log security-relevant changes

Only allow backend URLs whose hostname appears in `ALLOWED_BACKEND_HOSTS`.
