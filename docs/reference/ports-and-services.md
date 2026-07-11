# Ports and Services

| Service | Host port | Container port |
|---|---:|---:|
| `dashboard` | `4200` | `80` |
| `load-balancer` | `8080` | `8080` |
| `backend-fast` | Not required | `9001` |
| `backend-slow` | Not required | `9002` |
| `backend-unstable` | Not required | `9003` |

Backend services are reached by Docker DNS name.
