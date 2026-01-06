/**
 * API Authentication Helpers
 * 
 * Provides unified authentication checking for API routes that support
 * both NextAuth sessions and guest sessions
 */

import { auth } from './auth';
import { validateGuestSession, type GuestSessionInfo, hasGuestAccess, canGuestWrite } from './guest-session';
import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  isGuest: boolean;
  user?: {
    id: string;
    role: string;
    familyId: string;
    name: string;
  };
  guest?: GuestSessionInfo;
  error?: string;
}

/**
 * Authenticate request - checks both NextAuth and guest sessions
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // First try NextAuth session
  const session = await auth();
  if (session?.user) {
    return {
      authenticated: true,
      isGuest: false,
      user: {
        id: session.user.id,
        role: session.user.role,
        familyId: session.user.familyId,
        name: session.user.name || 'Unknown',
      },
    };
  }

  // Then try guest session
  const guestSessionToken = request.headers.get('x-guest-session-token');
  if (guestSessionToken) {
    const guestSession = await validateGuestSession(guestSessionToken);
    if (guestSession) {
      return {
        authenticated: true,
        isGuest: true,
        guest: guestSession,
      };
    }
  }

  return {
    authenticated: false,
    isGuest: false,
    error: 'Unauthorized',
  };
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return authResult;
}

/**
 * Require parent role - only parents can access
 */
export async function requireParent(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.isGuest) {
    return NextResponse.json(
      { error: 'Guest access not allowed for this endpoint' },
      { status: 403 }
    );
  }

  if (authResult.user?.role !== 'PARENT') {
    return NextResponse.json(
      { error: 'Only parents can access this endpoint' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Require write access - guests with VIEW_ONLY cannot write
 */
export async function requireWriteAccess(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.isGuest && !canGuestWrite(authResult.guest!)) {
    return NextResponse.json(
      { error: 'View-only guests cannot perform write operations' },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Require specific guest access level
 */
export async function requireGuestAccess(
  request: NextRequest,
  requiredLevel: 'VIEW_ONLY' | 'LIMITED' | 'CAREGIVER'
): Promise<AuthResult | NextResponse> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (authResult.isGuest) {
    if (!hasGuestAccess(authResult.guest!, requiredLevel)) {
      return NextResponse.json(
        { error: `This endpoint requires ${requiredLevel} access level` },
        { status: 403 }
      );
    }
  }

  return authResult;
}

/**
 * Get family ID from authenticated request
 */
export function getFamilyId(authResult: AuthResult): string {
  if (authResult.isGuest) {
    return authResult.guest!.familyId;
  }
  return authResult.user!.familyId;
}
