import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/screentime/allowances
 * List all screen time allowances for the family
 * Optional query params: memberId, screenTimeTypeId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const screenTimeTypeId = searchParams.get('screenTimeTypeId');

    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (screenTimeTypeId) {
      where.screenTimeTypeId = screenTimeTypeId;
    }

    const allowances = await prisma.screenTimeAllowance.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        screenTimeType: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { member: { name: 'asc' } },
        { screenTimeType: { name: 'asc' } },
      ],
    });

    return NextResponse.json({ allowances });
  } catch (error) {
    logger.error('Error fetching screen time allowances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screen time allowances' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/screentime/allowances
 * Create or update a screen time allowance (parents only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create/update allowances
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can manage screen time allowances' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      memberId,
      screenTimeTypeId,
      allowanceMinutes,
      period,
      rolloverEnabled,
      rolloverCapMinutes,
    } = body;

    if (!memberId || !screenTimeTypeId || !allowanceMinutes || !period) {
      return NextResponse.json(
        { error: 'Member ID, screen time type ID, allowance minutes, and period are required' },
        { status: 400 }
      );
    }

    if (allowanceMinutes < 0) {
      return NextResponse.json(
        { error: 'Allowance minutes must be non-negative' },
        { status: 400 }
      );
    }

    if (rolloverEnabled && rolloverCapMinutes !== null && rolloverCapMinutes < 0) {
      return NextResponse.json(
        { error: 'Rollover cap must be non-negative' },
        { status: 400 }
      );
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 400 }
      );
    }

    // Verify screen time type belongs to family
    const type = await prisma.screenTimeType.findFirst({
      where: {
        id: screenTimeTypeId,
        familyId: session.user.familyId,
        isArchived: false,
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: 'Screen time type not found or is archived' },
        { status: 400 }
      );
    }

    // Upsert allowance
    const allowance = await prisma.screenTimeAllowance.upsert({
      where: {
        memberId_screenTimeTypeId: {
          memberId,
          screenTimeTypeId,
        },
      },
      create: {
        memberId,
        screenTimeTypeId,
        allowanceMinutes,
        period,
        rolloverEnabled: rolloverEnabled || false,
        rolloverCapMinutes: rolloverCapMinutes || null,
      },
      update: {
        allowanceMinutes,
        period,
        rolloverEnabled: rolloverEnabled || false,
        rolloverCapMinutes: rolloverCapMinutes || null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        screenTimeType: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'SCREENTIME_ALLOWANCE_UPDATED',
        result: 'SUCCESS',
        metadata: {
          allowanceId: allowance.id,
          memberName: allowance.member.name,
          typeName: allowance.screenTimeType.name,
          allowanceMinutes,
          period,
          rolloverEnabled,
        },
      },
    });

    return NextResponse.json({
      allowance,
      message: 'Screen time allowance saved successfully',
    });
  } catch (error) {
    logger.error('Error saving screen time allowance:', error);
    return NextResponse.json(
      { error: 'Failed to save screen time allowance' },
      { status: 500 }
    );
  }
}
