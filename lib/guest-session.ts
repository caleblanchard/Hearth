/**
 * Guest Session Management
 * 
 * Handles validation and management of guest sessions stored in localStorage
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from './supabase/server';
import { logger } from './logger';

export interface GuestSessionInfo {
  sessionToken: string;
  inviteId: string;
  guestName: string;
  accessLevel: 'VIEW_ONLY' | 'LIMITED' | 'CAREGIVER';
  familyId: string;
  expiresAt: Date;
}

/**
 * Validate a guest session token from localStorage
 */
export async function validateGuestSession(
  sessionToken: string | null
): Promise<GuestSessionInfo | null> {
  if (!sessionToken) {
    return null;
  }

  try {
    const supabase = await createClient();
    
    const { data: session } = await supabase
      .from('guest_sessions')
      .select(`
        *,
        guest_invite:guest_invites(
          *,
          family:families(*)
        )
      `)
      .eq('session_token', sessionToken)
      .single();

    if (!session) {
      return null;
    }

    // Check if session has ended
    if (session.ended_at) {
      return null;
    }

    // Check if session is expired
    if (new Date() > new Date(session.expires_at)) {
      // Mark session as ended
      await supabase
        .from('guest_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.id);
      return null;
    }

    // Check if invite is still valid
    const invite = session.guest_invite;
    if (invite.status === 'REVOKED' || invite.status === 'EXPIRED') {
      return null;
    }

    if (new Date() > new Date(invite.expires_at)) {
      return null;
    }

    return {
      sessionToken: session.session_token,
      inviteId: invite.id,
      guestName: invite.guest_name,
      accessLevel: invite.access_level,
      familyId: invite.family_id,
      expiresAt: new Date(session.expires_at),
    };
  } catch (error) {
    logger.error('Error validating guest session:', error);
    return null;
  }
}

/**
 * Get guest session from request headers (for API routes)
 */
export async function getGuestSessionFromRequest(
  headers: Headers
): Promise<GuestSessionInfo | null> {
  const sessionToken = headers.get('x-guest-session-token');
  return validateGuestSession(sessionToken);
}

/**
 * End a guest session
 */
export async function endGuestSession(sessionToken: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data: session } = await supabase
      .from('guest_sessions')
      .select(`
        *,
        guest_invite:guest_invites(*)
      `)
      .eq('session_token', sessionToken)
      .single();

    if (!session || session.ended_at) {
      return false;
    }

    await supabase
      .from('guest_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        family_id: session.guest_invite.family_id,
        member_id: null,
        action: 'GUEST_SESSION_ENDED',
        result: 'SUCCESS',
        details: {
          sessionId: session.id,
          guestName: session.guest_invite.guest_name,
        },
      });

    return true;
  } catch (error) {
    logger.error('Error ending guest session:', error);
    return false;
  }
}

/**
 * Check if guest has required access level
 */
export function hasGuestAccess(
  guestSession: GuestSessionInfo | null,
  requiredLevel: 'VIEW_ONLY' | 'LIMITED' | 'CAREGIVER'
): boolean {
  if (!guestSession) {
    return false;
  }

  const levels: Record<string, number> = {
    VIEW_ONLY: 1,
    LIMITED: 2,
    CAREGIVER: 3,
  };

  return levels[guestSession.accessLevel] >= levels[requiredLevel];
}

/**
 * Check if guest can perform write operations
 */
export function canGuestWrite(guestSession: GuestSessionInfo | null): boolean {
  if (!guestSession) {
    return false;
  }

  // VIEW_ONLY cannot write, LIMITED and CAREGIVER can
  return guestSession.accessLevel !== 'VIEW_ONLY';
}
