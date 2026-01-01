import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } from '@/lib/rate-limit';
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip rate limiting for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Validate request size for API routes
  if (pathname.startsWith('/api')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_REQUEST_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: 'Request too large',
            message: `Request body exceeds maximum size of ${MAX_REQUEST_SIZE_BYTES / (1024 * 1024)}MB`,
          },
          { status: 413 }
        );
      }
    }
  }

  // Apply different rate limits based on endpoint type
  let limiter = apiRateLimiter;
  
  if (pathname.startsWith('/api/auth')) {
    limiter = authRateLimiter;
  } else if (pathname.startsWith('/api/cron')) {
    limiter = cronRateLimiter;
  }

  const identifier = getClientIdentifier(request);
  const result = limiter.check(identifier);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limiter.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limiter.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
