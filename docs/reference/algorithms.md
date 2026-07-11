# Load-Balancing Algorithms

## Round Robin

Sequentially rotates through healthy backends.

## Weighted Round Robin

Distributes requests according to configured weights.

## Least Connections

Selects the backend with the fewest active requests. Treat this as active only when connection tracking is implemented.

All algorithms must operate on the current eligible backend set.
