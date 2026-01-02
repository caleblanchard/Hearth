/**
 * Kiosk Session Business Logic
 *
 * This module handles the business logic for kiosk sessions including:
 * - Creating and managing kiosk sessions
 * - Auto-lock timeout checking
 * - Member authentication via PIN
 * - Family ownership verification
 */

import prisma from '@/lib/prisma';
import { KioskSession, FamilyMember } from '@/app/generated/prisma';
import bcrypt from 'bcrypt';

/**
 * Create a new kiosk session for a device
 */
export async function createKioskSession(
  deviceId: string,
  familyId: string
): Promise<KioskSession> {
  // Check if session already exists for this device
  const existingSession = await prisma.kioskSession.findUnique({
    where: { deviceId },
  });

  if (existingSession && existingSession.isActive) {
    // Reactivate existing session
    return await prisma.kioskSession.update({
      where: { id: existingSession.id },
      data: {
        lastActivityAt: new Date(),
        currentMemberId: null, // Start locked
      },
    });
  }

  // Create new session
  return await prisma.kioskSession.create({
    data: {
      familyId,
      deviceId,
      currentMemberId: null, // Start locked
      lastActivityAt: new Date(),
    },
  });
}

/**
 * Get kiosk session by session token
 */
export async function getKioskSession(
  sessionToken: string
): Promise<KioskSession | null> {
  return await prisma.kioskSession.findUnique({
    where: { sessionToken },
    include: {
      currentMember: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
  });
}

/**
 * Update last activity timestamp for kiosk session
 */
export async function updateKioskActivity(
  sessionToken: string
): Promise<KioskSession> {
  return await prisma.kioskSession.update({
    where: { sessionToken },
    data: {
      lastActivityAt: new Date(),
    },
  });
}

/**
 * Lock kiosk session (clear current member)
 */
export async function lockKioskSession(
  sessionToken: string
): Promise<KioskSession> {
  return await prisma.kioskSession.update({
    where: { sessionToken },
    data: {
      currentMemberId: null,
    },
  });
}

/**
 * Unlock kiosk session with member PIN
 */
export async function unlockKioskSession(
  sessionToken: string,
  memberId: string,
  pin: string
): Promise<{ success: boolean; session?: KioskSession; error?: string }> {
  // Get session
  const session = await prisma.kioskSession.findUnique({
    where: { sessionToken },
  });

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  // Get member
  const member = await prisma.familyMember.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return { success: false, error: 'Member not found' };
  }

  // Verify family ownership
  if (member.familyId !== session.familyId) {
    return { success: false, error: 'Member not in session family' };
  }

  // Verify PIN
  if (!member.pin) {
    return { success: false, error: 'Member has no PIN set' };
  }

  const pinMatch = await bcrypt.compare(pin, member.pin);
  if (!pinMatch) {
    return { success: false, error: 'Invalid PIN' };
  }

  // Update session
  const updatedSession = await prisma.kioskSession.update({
    where: { sessionToken },
    data: {
      currentMemberId: memberId,
      lastActivityAt: new Date(),
    },
  });

  return { success: true, session: updatedSession };
}

/**
 * End kiosk session
 */
export async function endKioskSession(
  sessionToken: string
): Promise<KioskSession> {
  return await prisma.kioskSession.update({
    where: { sessionToken },
    data: {
      isActive: false,
      currentMemberId: null,
    },
  });
}

/**
 * Check if session should auto-lock based on inactivity
 */
export function checkAutoLock(session: KioskSession): boolean {
  const now = new Date();
  const lastActivity = new Date(session.lastActivityAt);
  const timeoutMs = session.autoLockMinutes * 60 * 1000;
  const timeSinceActivity = now.getTime() - lastActivity.getTime();

  return timeSinceActivity >= timeoutMs;
}

/**
 * Get kiosk settings for family (or create defaults)
 */
export async function getOrCreateKioskSettings(familyId: string) {
  let settings = await prisma.kioskSettings.findUnique({
    where: { familyId },
  });

  if (!settings) {
    settings = await prisma.kioskSettings.create({
      data: {
        familyId,
        isEnabled: true,
        autoLockMinutes: 15,
        enabledWidgets: ['transport', 'medication', 'maintenance', 'inventory', 'weather'],
        allowGuestView: true,
        requirePinForSwitch: true,
      },
    });
  }

  return settings;
}
