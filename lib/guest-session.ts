/**
 * Guest Session Management
 * 
 * Handles validation and management of guest sessions stored in localStorage
 */

import prisma from './prisma';
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
    const session = await prisma.guestSession.findUnique({
      where: { sessionToken },
      include: {
        guestInvite: {
          include: {
            family: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    // Check if session has ended
    if (session.endedAt) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Mark session as ended
      await prisma.guestSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() },
      });
      return null;
    }

    // Check if invite is still valid
    const invite = session.guestInvite;
    if (invite.status === 'REVOKED' || invite.status === 'EXPIRED') {
      return null;
    }

    if (new Date() > invite.expiresAt) {
      return null;
    }

    return {
      sessionToken: session.sessionToken,
      inviteId: invite.id,
      guestName: invite.guestName,
      accessLevel: invite.accessLevel,
      familyId: invite.familyId,
      expiresAt: session.expiresAt,
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
    const session = await prisma.guestSession.findUnique({
      where: { sessionToken },
      include: {
        guestInvite: true,
      },
    });

    if (!session || session.endedAt) {
      return false;
    }

    await prisma.guestSession.update({
      where: { id: session.id },
      data: { endedAt: new Date() },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.guestInvite.familyId,
        memberId: null,
        action: 'GUEST_SESSION_ENDED',
        result: 'SUCCESS',
        metadata: {
          sessionId: session.id,
          guestName: session.guestInvite.guestName,
        },
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
