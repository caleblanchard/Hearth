import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify invite exists and belongs to family
    const existingInvite = await prisma.guestInvite.findUnique({
      where: { id: params.id },
    });

    if (!existingInvite) {
      return NextResponse.json(
        { error: 'Guest invite not found' },
        { status: 404 }
      );
    }

    if (existingInvite.familyId !== session.user.familyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only parents can revoke guest invites
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can revoke guest invites' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Revoke the invite
    await prisma.guestInvite.update({
      where: { id: params.id },
      data: {
        status: 'REVOKED',
        revokedAt: now,
      },
    });

    // End all active sessions for this invite
    await prisma.guestSession.updateMany({
      where: {
        guestInviteId: params.id,
        endedAt: null,
      },
      data: {
        endedAt: now,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'GUEST_INVITE_REVOKED',
        result: 'SUCCESS',
        metadata: {
          inviteId: existingInvite.id,
          guestName: existingInvite.guestName,
        },
      },
    });

    return NextResponse.json({
      message: 'Guest invite revoked successfully',
    });
  } catch (error) {
    logger.error('Error revoking guest invite:', error);
    return NextResponse.json(
      { error: 'Failed to revoke guest invite' },
      { status: 500 }
    );
  }
}
