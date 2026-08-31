import time
from fastapi import Request, HTTPException, status

# Registry of all RateLimiter instances for test cleanup
_all_limiters: list = []

class RateLimiter:
    """
    A simple in-memory rate limiter for single-instance deployments.
    Tracks the number of requests per IP address for a specific endpoint within a time window.

    Limitation: Not synchronized across multiple application workers or
    horizontally scaled instances. Suitable for single-instance deployment/demo only.
    """
    def __init__(self, max_requests: int = 5, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = {}
        _all_limiters.append(self)

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = client_ip
        
        now = time.time()
        
        if key not in self.requests:
            self.requests[key] = []
            
        # Clean up old requests
        self.requests[key] = [t for t in self.requests[key] if now - t < self.window_seconds]
        
        if len(self.requests[key]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )
            
        self.requests[key].append(now)

    def reset(self):
        """Clear all tracked requests. Used for testing."""
        self.requests.clear()


def reset_all_limiters():
    """Reset all registered rate limiter instances. Called between tests."""
    for limiter in _all_limiters:
        limiter.reset()

