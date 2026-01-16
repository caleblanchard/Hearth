import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { apiRateLimiter, authRateLimiter, cronRateLimiter, getClientIdentifier } from '@/lib/rate-limit-redis';
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function proxy(request: NextRequest) {
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

  const isCloudMode = process.env.VERCEL === '1';
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/kiosk');
  const isAuthRoute = pathname.startsWith('/auth');
  const isOnboardingRoute = pathname.startsWith('/onboarding');

  // Redirect unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    const redirectUrl = isCloudMode 
      ? new URL('/', request.url) 
      : new URL('/auth/signin', request.url);
    if (!isCloudMode) {
      redirectUrl.searchParams.set('redirectTo', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users trying to access onboarding
  if (!user && isOnboardingRoute) {
    const redirectUrl = isCloudMode 
      ? new URL('/', request.url) 
      : new URL('/auth/signin', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // For authenticated users, check family membership
  if (user) {
    // Check if user has ANY family (just need to know if they belong to at least one)
    const { data: familyMembers, error } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('auth_user_id', user.id)
      .limit(1);

    if (error) {
      logger.error('Error checking family membership in middleware:', error);
    }

    const hasFamilies = familyMembers && familyMembers.length > 0;
    
    // Debug logging
    if (pathname === '/dashboard' || pathname === '/onboarding') {
      logger.info(`Middleware check for ${pathname}: user=${user.id}, hasFamilies=${hasFamilies}, familyCount=${familyMembers?.length || 0}`);
    }

    // User accessing dashboard without a family - redirect to onboarding
    if (isProtectedRoute && !hasFamilies) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // Allow users to access onboarding even if they have a family
    // (to create additional families)
    // Remove the redirect that blocked this

    // User accessing auth pages with a family - redirect to dashboard
    if (isAuthRoute && pathname !== '/auth/signout' && hasFamilies) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // User accessing auth pages without a family - redirect to onboarding
    if (isAuthRoute && pathname !== '/auth/signout' && !hasFamilies) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
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
