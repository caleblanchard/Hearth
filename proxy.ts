import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  apiRateLimiter,
  authRateLimiter,
  cronRateLimiter,
  getClientIdentifier,
} from '@/lib/rate-limit';
import { MAX_REQUEST_SIZE_BYTES } from '@/lib/constants';
import { createServiceClient } from '@/lib/supabase/service';
import { hashSecret } from '@/lib/kiosk-auth';

async function isKioskDevice(request: NextRequest) {
  const headerSecret = request.headers.get('x-kiosk-device');
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieSecret =
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('kiosk_device_secret='))?.split('=')[1] || null;

  const secret = headerSecret || cookieSecret;
  if (!secret) return false;

  const supabase = createServiceClient();
  const secretHash = hashSecret(secret);

  const { data, error } = await supabase
    .from('kiosk_device_secrets')
    .select('id,revoked_at')
    .eq('secret_hash', secretHash)
    .is('revoked_at', null)
    .maybeSingle();

  return !error && !!data;
}

async function isKioskChild(request: NextRequest) {
  const headerToken = request.headers.get('x-kiosk-child');
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieToken =
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('kiosk_child_token='))?.split('=')[1] || null;

  const token = headerToken || cookieToken;
  if (!token) return false;

  const supabase = createServiceClient();
  const tokenHash = hashSecret(token);

  const { data, error } = await supabase
    .from('kiosk_child_sessions')
    .select('id,expires_at,ended_at')
    .eq('session_token_hash', tokenHash)
    .is('ended_at', null)
    .maybeSingle();

  if (error || !data) return false;

  const expiresAt = new Date(data.expires_at);
  return expiresAt.getTime() > Date.now();
}

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
  const kioskDevice = user ? false : await isKioskDevice(request);
  const kioskChild = user ? false : await isKioskChild(request);

  const isCloudMode = process.env.VERCEL === '1';
  const isKioskRoute = pathname.startsWith('/kiosk');
  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname.startsWith('/auth');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const allowKioskAccess = kioskDevice && isKioskRoute;

  // Redirect unauthenticated users trying to access protected routes
  if (!user && !kioskChild && !allowKioskAccess && isProtectedRoute) {
    const redirectUrl = isCloudMode 
      ? new URL('/', request.url) 
      : new URL('/auth/signin', request.url);
    if (!isCloudMode) {
      redirectUrl.searchParams.set('redirectTo', pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users trying to access onboarding
  if (!user && !kioskChild && !allowKioskAccess && isOnboardingRoute) {
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
      console.error('Error checking family membership in middleware:', error);
    }

    const hasFamilies = familyMembers && familyMembers.length > 0;
    
    // Debug logging
    if (pathname === '/dashboard' || pathname === '/onboarding') {
      console.info(
        `Middleware check for ${pathname}: user=${user.id}, hasFamilies=${hasFamilies}, familyCount=${familyMembers?.length || 0}`
      );
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
  } else if (kioskChild) {
    if (isAuthRoute && pathname !== '/auth/signout') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else if (kioskDevice && isAuthRoute && pathname !== '/auth/signout') {
    return NextResponse.redirect(new URL('/kiosk', request.url));
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
        console.warn('Request size exceeded in middleware', {
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
