import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApprovalItem, ApprovalType } from '@/types/approvals';

/**
 * GET /api/approvals
 * 
 * Returns unified queue of all pending approval items across modules
 * (chores, rewards, shopping, calendar)
 * 
 * Query Parameters:
 * - type: Filter by approval type (optional)
 * - memberId: Filter by family member (optional)
 * - sort: Sort field - 'date' | 'priority' | 'type' (default: 'date')
 * - order: Sort order - 'asc' | 'desc' (default: 'asc')
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can view approval queue
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can view the approval queue' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type') as ApprovalType | null;
    const memberIdFilter = searchParams.get('memberId');
    const sort = searchParams.get('sort') || 'date';
    const order = searchParams.get('order') || 'asc';

    const familyId = session.user.familyId;
    const approvals: ApprovalItem[] = [];

    // 1. Fetch pending chore completions (COMPLETED status, awaiting approval)
    if (!typeFilter || typeFilter === 'CHORE_COMPLETION') {
      const choreCompletions = await prisma.choreInstance.findMany({
        where: {
          status: 'COMPLETED',
          choreSchedule: {
            choreDefinition: {
              familyId,
            },
          },
          ...(memberIdFilter && { assignedToId: memberIdFilter }),
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          choreSchedule: {
            include: {
              choreDefinition: {
                select: {
                  name: true,
                  creditValue: true,
                  familyId: true,
                },
              },
            },
          },
        },
        orderBy: {
          completedAt: 'asc',
        },
      });

      for (const chore of choreCompletions) {
        // Filter out chores from other families (shouldn't happen, but defensive)
        if (chore.choreSchedule.choreDefinition.familyId !== familyId) {
          continue;
        }

        approvals.push({
          id: `chore-${chore.id}`,
          type: 'CHORE_COMPLETION',
          familyMemberId: chore.assignedTo.id,
          familyMemberName: chore.assignedTo.name,
          familyMemberAvatarUrl: chore.assignedTo.avatarUrl || undefined,
          title: chore.choreSchedule.choreDefinition.name,
          description: `Completed ${chore.completedAt ? new Date(chore.completedAt).toLocaleDateString() : 'recently'}`,
          requestedAt: chore.completedAt || new Date(),
          metadata: {
            credits: chore.choreSchedule.choreDefinition.creditValue,
            notes: chore.notes,
            photoUrl: chore.photoUrl,
            completedAt: chore.completedAt,
          },
          priority: calculatePriority({
            type: 'CHORE_COMPLETION',
            requestedAt: chore.completedAt || new Date(),
            photoUrl: chore.photoUrl,
          }),
        });
      }
    }

    // 2. Fetch pending reward redemptions
    if (!typeFilter || typeFilter === 'REWARD_REDEMPTION') {
      const rewardRedemptions = await prisma.rewardRedemption.findMany({
        where: {
          status: 'PENDING',
          reward: {
            familyId,
          },
          ...(memberIdFilter && { memberId: memberIdFilter }),
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          reward: {
            select: {
              name: true,
              costCredits: true,
              familyId: true,
            },
          },
        },
        orderBy: {
          requestedAt: 'asc',
        },
      });

      for (const redemption of rewardRedemptions) {
        // Filter out redemptions from other families
        if (redemption.reward.familyId !== familyId) {
          continue;
        }

        approvals.push({
          id: `reward-${redemption.id}`,
          type: 'REWARD_REDEMPTION',
          familyMemberId: redemption.member.id,
          familyMemberName: redemption.member.name,
          familyMemberAvatarUrl: redemption.member.avatarUrl || undefined,
          title: redemption.reward.name,
          description: `Requested ${new Date(redemption.requestedAt).toLocaleDateString()}`,
          requestedAt: redemption.requestedAt,
          metadata: {
            costCredits: redemption.reward.costCredits,
            requestedAt: redemption.requestedAt,
          },
          priority: calculatePriority({
            type: 'REWARD_REDEMPTION',
            requestedAt: redemption.requestedAt,
            costCredits: redemption.reward.costCredits,
          }),
        });
      }
    }

    // 3. Fetch pending shopping item requests
    // Note: Current schema doesn't have requestedById, so we'll skip for now
    // This can be added when shopping items support request/approval workflow

    // 4. Sort approvals
    approvals.sort((a, b) => {
      let comparison = 0;

      if (sort === 'date') {
        comparison = a.requestedAt.getTime() - b.requestedAt.getTime();
      } else if (sort === 'priority') {
        const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
        comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
      } else if (sort === 'type') {
        comparison = a.type.localeCompare(b.type);
      }

      return order === 'desc' ? -comparison : comparison;
    });

    logger.info('Fetched approval queue', {
      familyId,
      total: approvals.length,
      typeFilter,
      memberIdFilter,
    });

    return NextResponse.json({
      approvals,
      total: approvals.length,
    });
  } catch (error) {
    logger.error('Error fetching approval queue', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval queue' },
      { status: 500 }
    );
  }
}

/**
 * Calculate priority based on approval type and metadata
 */
function calculatePriority(data: {
  type: ApprovalType;
  requestedAt: Date;
  photoUrl?: string | null;
  costCredits?: number;
}): 'HIGH' | 'NORMAL' | 'LOW' {
  const { type, requestedAt, photoUrl, costCredits } = data;

  // High priority if chore has photo proof (child put effort in)
  if (type === 'CHORE_COMPLETION' && photoUrl) {
    return 'HIGH';
  }

  // High priority if reward costs >100 credits (significant request)
  if (type === 'REWARD_REDEMPTION' && costCredits && costCredits > 100) {
    return 'HIGH';
  }

  // High priority if waiting >24 hours
  const hoursPending = (Date.now() - requestedAt.getTime()) / (1000 * 60 * 60);
  if (hoursPending > 24) {
    return 'HIGH';
  }

  // Normal priority if waiting 12-24 hours
  if (hoursPending > 12) {
    return 'NORMAL';
  }

  // Low priority for recent requests
  return 'LOW';
}
