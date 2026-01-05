import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateRemainingTime } from '@/lib/screentime-utils';
import { logger } from '@/lib/logger';

/**
 * GET /api/screentime/allowances/[memberId]
 * Get all allowances for a specific member with remaining time calculations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: params.memberId },
      select: { id: true, familyId: true, name: true },
    });

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Member not found or does not belong to your family' },
        { status: 404 }
      );
    }

    // Get all allowances for this member
    const allowances = await prisma.screenTimeAllowance.findMany({
      where: {
        memberId: params.memberId,
        screenTimeType: {
          isActive: true,
          isArchived: false,
        },
      },
      include: {
        screenTimeType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: {
        screenTimeType: {
          name: 'asc',
        },
      },
    });

    // Calculate remaining time for each allowance
    const allowancesWithRemaining = await Promise.all(
      allowances.map(async (allowance) => {
        const remaining = await calculateRemainingTime(
          params.memberId,
          allowance.screenTimeTypeId
        );

        return {
          ...allowance,
          remaining: {
            remainingMinutes: remaining.remainingMinutes,
            usedMinutes: remaining.usedMinutes,
            rolloverMinutes: remaining.rolloverMinutes,
            periodStart: remaining.periodStart,
            periodEnd: remaining.periodEnd,
          },
        };
      })
    );

    return NextResponse.json({
      member: {
        id: member.id,
        name: member.name,
      },
      allowances: allowancesWithRemaining,
    });
  } catch (error) {
    logger.error('Error fetching member allowances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member allowances' },
      { status: 500 }
    );
  }
}
