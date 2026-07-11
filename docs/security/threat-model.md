# Threat Model

## Assets

- Administrative APIs
- Backend configuration
- Runtime metrics
- Environment variables
- Internal service network

## Threats

- SSRF through arbitrary backend registration
- Unauthorized backend modification
- Secret exposure
- Request flooding
- Header injection
- Vulnerable container images

## Controls

- Backend hostname allowlist
- Administrative authentication
- Input validation
- Rate limiting
- Non-root containers
- Image scanning
