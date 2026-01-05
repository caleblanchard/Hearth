import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

const VALID_ACCESS_LEVELS = ['VIEW_ONLY', 'LIMITED', 'CAREGIVER'];

// Generate a 6-digit invite code
function generateInviteCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create guest invites
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create guest invites' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { guestName, guestEmail, accessLevel, durationHours, maxUses } = body;

    // Validate required fields
    if (!guestName || !accessLevel || !durationHours) {
      return NextResponse.json(
        { error: 'Guest name, access level, and duration are required' },
        { status: 400 }
      );
    }

    // Validate access level
    if (!VALID_ACCESS_LEVELS.includes(accessLevel)) {
      return NextResponse.json(
        {
          error: `Invalid access level. Must be one of: ${VALID_ACCESS_LEVELS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Generate unique invite code and token
    const inviteCode = generateInviteCode();
    const inviteToken = generateToken();

    // Create guest invite
    const invite = await prisma.guestInvite.create({
      data: {
        familyId: session.user.familyId,
        invitedById: session.user.id,
        guestName: guestName.trim(),
        guestEmail: guestEmail?.trim() || null,
        accessLevel,
        inviteCode,
        inviteToken,
        expiresAt,
        maxUses: maxUses || 1,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'GUEST_INVITE_CREATED',
        result: 'SUCCESS',
        metadata: {
          inviteId: invite.id,
          guestName: invite.guestName,
          accessLevel: invite.accessLevel,
        },
      },
    });

    return NextResponse.json(
      { invite, message: 'Guest invite created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating guest invite:', error);
    return NextResponse.json(
      { error: 'Failed to create guest invite' },
      { status: 500 }
    );
  }
}
