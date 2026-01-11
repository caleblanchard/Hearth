import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } from '@/lib/rate-limit-redis';
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { CACHE_TTL_MS } from '@/lib/constants';

// Cache the onboarding status in memory to avoid database hits on every request
let onboardingStatusCache: { complete: boolean; lastCheck: number } | null = null;

async function checkOnboardingStatus(): Promise<boolean> {
  // Return cached status if available and fresh
  if (onboardingStatusCache && Date.now() - onboardingStatusCache.lastCheck < CACHE_TTL_MS) {
    return onboardingStatusCache.complete;
  }

  try {
    // Check onboarding status via API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/onboarding/check`);
    const data = await response.json();

    // Update cache
    onboardingStatusCache = {
      complete: data.onboardingComplete === true,
      lastCheck: Date.now(),
    };

    return onboardingStatusCache.complete;
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    // On error, assume onboarding is complete to avoid blocking access
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Update Supabase session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get the user (validates JWT with Supabase Auth server)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users trying to access protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/kiosk');
  const isAuthRoute = pathname.startsWith('/auth');

  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute && pathname !== '/auth/signout') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check onboarding status for all routes except onboarding and its API
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isOnboardingAPI = pathname.startsWith('/api/onboarding');
  const isAuthAPI = pathname.startsWith('/api/auth');
  const isHealthAPI = pathname === '/api/health';
  const isGeocodingAPI = pathname === '/api/geocoding';

  if (!isOnboardingRoute && !isOnboardingAPI && !isAuthAPI && !isHealthAPI && !isGeocodingAPI) {
    const onboardingComplete = await checkOnboardingStatus();

    if (!onboardingComplete) {
      // Redirect to onboarding page
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // If trying to access onboarding when already complete, redirect to dashboard
  if (isOnboardingRoute && !isOnboardingAPI) {
    const onboardingComplete = await checkOnboardingStatus();

    if (onboardingComplete) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Skip rate limiting for session checks (read-only, called frequently)
  if (pathname === '/api/auth/session' || pathname === '/api/auth/csrf') {
    return NextResponse.next();
  }

  // Validate request size for API routes
  // Note: Full body validation happens in route handlers using parseJsonBody
  // This is a quick check on content-length header
  if (pathname.startsWith('/api')) {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_REQUEST_SIZE_BYTES) {
        logger.warn('Request size exceeded in middleware', {
          size,
          maxSize: MAX_REQUEST_SIZE_BYTES,
          path: pathname,
        });
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
  const result = await limiter.check(identifier);

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
