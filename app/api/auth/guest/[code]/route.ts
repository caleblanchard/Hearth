import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Generate a secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // Find invite by code
    const invite = await prisma.guestInvite.findUnique({
      where: { inviteCode: params.code },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    // Check if invite is expired
    if (new Date() > new Date(invite.expiresAt)) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
    }

    // Check if invite is revoked
    if (invite.status === 'REVOKED') {
      return NextResponse.json({ error: 'Invite has been revoked' }, { status: 400 });
    }

    // Check if max uses exceeded
    if (invite.useCount >= invite.maxUses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses' },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const now = new Date();

    // Generate session token
    const sessionToken = generateSessionToken();

    // Create guest session
    const session = await prisma.guestSession.create({
      data: {
        guestInviteId: invite.id,
        sessionToken,
        ipAddress,
        userAgent,
        expiresAt: invite.expiresAt, // Session expires when invite expires
      },
    });

    // Update invite: increment use count, set status to ACTIVE, update last accessed
    await prisma.guestInvite.update({
      where: { id: invite.id },
      data: {
        status: 'ACTIVE',
        useCount: { increment: 1 },
        lastAccessedAt: now,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: invite.familyId,
        memberId: null, // Guest is not a family member
        action: 'GUEST_SESSION_STARTED',
        result: 'SUCCESS',
        metadata: {
          inviteId: invite.id,
          guestName: invite.guestName,
          accessLevel: invite.accessLevel,
        },
      },
    });

    return NextResponse.json({
      session,
      invite: {
        id: invite.id,
        guestName: invite.guestName,
        accessLevel: invite.accessLevel,
        expiresAt: invite.expiresAt,
      },
      message: 'Guest session started successfully',
    });
  } catch (error) {
    console.error('Error starting guest session:', error);
    return NextResponse.json(
      { error: 'Failed to start guest session' },
      { status: 500 }
    );
  }
}
