# Security Features

This document outlines the security measures implemented in the Hearth application.

## CSRF Protection

Next.js provides built-in CSRF protection for API routes. The application leverages this protection through:

1. **NextAuth.js**: Uses secure session cookies with SameSite protection
2. **Next.js API Routes**: Automatically validates CSRF tokens for state-changing operations
3. **Session Management**: JWT-based sessions with secure cookie handling

### Additional CSRF Measures

- All POST/PATCH/DELETE endpoints require authentication
- Session tokens are validated on every request
- Cookies are configured with `httpOnly` and `secure` flags (in production)

## Rate Limiting

Rate limiting is implemented to prevent abuse and brute force attacks:

- **General API Routes**: 100 requests per minute per IP
- **Authentication Endpoints**: 5 requests per minute per IP
- **Cron Endpoints**: 10 requests per minute per IP

### Implementation

The rate limiter uses an in-memory store. For production deployments with multiple instances, consider:

1. Using a distributed rate limiter (e.g., `@upstash/ratelimit` with Redis)
2. Implementing rate limiting at the load balancer/proxy level
3. Using a service like Cloudflare for DDoS protection

### Rate Limit Headers

All API responses include rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets
- `Retry-After`: Seconds to wait before retrying (on 429 responses)

## Input Validation

All API endpoints validate JSON input to prevent:
- Malformed JSON causing crashes
- Type coercion attacks
- Unexpected data structures

## Authentication & Authorization

- **Parent Accounts**: Full access to all features
- **Child Accounts**: Limited access based on role
- **Family Isolation**: All queries are scoped to the user's family
- **Session Management**: 30-day session expiration with secure token storage

## Environment Variables

Critical secrets are stored in environment variables:
- `NEXTAUTH_SECRET`: Required for session encryption
- `CRON_SECRET`: Required for cron endpoint authentication
- `DATABASE_URL`: Database connection string

**Important**: Never commit `.env` files to version control.

## Security Best Practices

1. **Always validate input** before processing
2. **Use transactions** for operations affecting multiple records
3. **Verify family membership** in all queries
4. **Log security events** via audit logs
5. **Keep dependencies updated** to patch vulnerabilities

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly rather than opening a public issue.
