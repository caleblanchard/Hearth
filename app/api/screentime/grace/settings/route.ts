import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOrCreateGraceSettings } from '@/lib/screentime-grace';
import { GraceRepaymentMode } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get memberId from query params (optional)
    const { searchParams } = new URL(request.url);
    const queryMemberId = searchParams.get('memberId');
    const memberId = queryMemberId || session.user.id;

    // If viewing another member's settings, verify permissions
    if (memberId !== session.user.id) {
      // Only parents can view other members' settings
      if (session.user.role !== 'PARENT') {
        return NextResponse.json(
          { error: 'Cannot view other members settings' },
          { status: 403 }
        );
      }

      // Verify member belongs to same family
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
      });

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: 'Cannot view settings from other families' },
          { status: 403 }
        );
      }
    }

    // Get or create settings
    const settings = await getOrCreateGraceSettings(memberId);

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Error fetching grace settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grace settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can update settings
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can update grace settings' },
        { status: 403 }
      );
    }

    const {
      memberId,
      gracePeriodMinutes,
      maxGracePerDay,
      maxGracePerWeek,
      graceRepaymentMode,
      lowBalanceWarningMinutes,
      requiresApproval,
    } = await request.json();

    // Verify member belongs to same family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Cannot update settings for members from other families' },
        { status: 403 }
      );
    }

    // Validate positive numbers
    if (
      gracePeriodMinutes <= 0 ||
      maxGracePerDay < 0 ||
      maxGracePerWeek < 0 ||
      lowBalanceWarningMinutes <= 0
    ) {
      return NextResponse.json(
        { error: 'All numeric values must be positive' },
        { status: 400 }
      );
    }

    // Validate enum
    const validModes = Object.values(GraceRepaymentMode);
    if (!validModes.includes(graceRepaymentMode)) {
      return NextResponse.json(
        { error: 'Invalid repayment mode' },
        { status: 400 }
      );
    }

    // Upsert settings
    const settings = await prisma.screenTimeGraceSettings.upsert({
      where: { memberId },
      update: {
        gracePeriodMinutes,
        maxGracePerDay,
        maxGracePerWeek,
        graceRepaymentMode,
        lowBalanceWarningMinutes,
        requiresApproval,
      },
      create: {
        memberId,
        gracePeriodMinutes,
        maxGracePerDay,
        maxGracePerWeek,
        graceRepaymentMode,
        lowBalanceWarningMinutes,
        requiresApproval,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_ADJUSTED',
        entityType: 'GRACE_SETTINGS',
        result: 'SUCCESS',
        metadata: {
          targetMemberId: memberId,
          settings: {
            gracePeriodMinutes,
            maxGracePerDay,
            maxGracePerWeek,
            graceRepaymentMode,
            lowBalanceWarningMinutes,
            requiresApproval,
          },
        },
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    logger.error('Error updating grace settings:', error);
    return NextResponse.json(
      { error: 'Failed to update grace settings' },
      { status: 500 }
    );
  }
}
