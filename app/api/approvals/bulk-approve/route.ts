import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BulkApprovalRequest, BulkApprovalResponse } from '@/types/approvals';

/**
 * POST /api/approvals/bulk-approve
 * Approve multiple approval items at once
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parent-only check
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can approve items' },
        { status: 403 }
      );
    }

    const body: BulkApprovalRequest = await request.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const results: BulkApprovalResponse = {
      success: [],
      failed: [],
      total: itemIds.length
    };

    // Process each item
    for (const itemId of itemIds) {
      try {
        // Extract type and ID (ID may contain dashes for UUIDs)
        const dashIndex = itemId.indexOf('-');
        if (dashIndex === -1) {
          results.failed.push({
            itemId,
            reason: 'Invalid item ID format'
          });
          continue;
        }
        
        const type = itemId.substring(0, dashIndex);
        const id = itemId.substring(dashIndex + 1);
        
        if (type === 'chore') {
          // Approve chore completion
          const choreInstance = await prisma.choreInstance.findUnique({
            where: { id },
            include: {
              choreSchedule: {
                include: {
                  choreDefinition: {
                    include: {
                      family: true
                    }
                  }
                }
              },
              assignedTo: true
            }
          });

          if (!choreInstance) {
            results.failed.push({
              itemId,
              reason: 'Chore instance not found'
            });
            continue;
          }

          // Family isolation check
          if (choreInstance.choreSchedule.choreDefinition.familyId !== session.user.familyId) {
            results.failed.push({
              itemId,
              reason: 'Not authorized to approve this chore'
            });
            continue;
          }

          // Check if already approved/rejected
          if (choreInstance.status !== 'COMPLETED') {
            results.failed.push({
              itemId,
              reason: `Chore is ${choreInstance.status}, not awaiting approval`
            });
            continue;
          }

          // Update chore instance and award credits in a transaction
          await prisma.$transaction(async (tx) => {
            // Update chore status
            await tx.choreInstance.update({
              where: { id },
              data: {
                status: 'APPROVED',
                approvedById: session.user.id,
                approvedAt: new Date(),
                creditsAwarded: choreInstance.choreSchedule.choreDefinition.creditValue || 0
              }
            });

            // Award credits to the member by creating a credit transaction
            const creditValue = choreInstance.choreSchedule.choreDefinition.creditValue || 0;
            if (creditValue > 0 && choreInstance.assignedToId) {
              // Get current balance from most recent transaction
              const lastTransaction = await tx.creditTransaction.findFirst({
                where: { memberId: choreInstance.assignedToId },
                orderBy: { createdAt: 'desc' },
                select: { balanceAfter: true }
              });

              const currentBalance = lastTransaction?.balanceAfter || 0;
              const newBalance = currentBalance + creditValue;

              // Create credit transaction
              await tx.creditTransaction.create({
                data: {
                  memberId: choreInstance.assignedToId,
                  type: 'CHORE_REWARD',
                  amount: creditValue,
                  balanceAfter: newBalance,
                  reason: `Chore approved: ${choreInstance.choreSchedule.choreDefinition.name}`,
                  category: 'OTHER',
                  relatedChoreInstanceId: id,
                  adjustedById: session.user.id
                }
              });
            }

            // Create audit log entry
            await tx.auditLog.create({
              data: {
                familyId: session.user.familyId!,
                memberId: session.user.id,
                action: 'CHORE_APPROVED',
                entityType: 'CHORE_INSTANCE',
                entityId: id,
                metadata: JSON.stringify({
                  choreDefinitionId: choreInstance.choreSchedule.choreDefinitionId,
                  assignedToId: choreInstance.assignedToId,
                  creditsAwarded: creditValue
                })
              }
            });
          });

          results.success.push(itemId);

        } else if (type === 'reward') {
          // Approve reward redemption
          const redemption = await prisma.rewardRedemption.findUnique({
            where: { id },
            include: {
              reward: true,
              member: true
            }
          });

          if (!redemption) {
            results.failed.push({
              itemId,
              reason: 'Reward redemption not found'
            });
            continue;
          }

          // Family isolation check
          if (redemption.reward.familyId !== session.user.familyId) {
            results.failed.push({
              itemId,
              reason: 'Not authorized to approve this redemption'
            });
            continue;
          }

          // Check if already approved/rejected
          if (redemption.status !== 'PENDING') {
            results.failed.push({
              itemId,
              reason: `Redemption is ${redemption.status}, not awaiting approval`
            });
            continue;
          }

          // Update redemption status in a transaction
          await prisma.$transaction(async (tx) => {
            // Update redemption status
            await tx.rewardRedemption.update({
              where: { id },
              data: {
                status: 'APPROVED',
                approvedById: session.user.id,
                approvedAt: new Date()
              }
            });

            // Create audit log entry
            await tx.auditLog.create({
              data: {
                familyId: session.user.familyId!,
                memberId: session.user.id,
                action: 'REWARD_APPROVED',
                entityType: 'REWARD_REDEMPTION',
                entityId: id,
                metadata: JSON.stringify({
                  rewardId: redemption.rewardId,
                  memberId: redemption.memberId,
                  creditCost: redemption.reward.costCredits
                })
              }
            });
          });

          results.success.push(itemId);

        } else {
          results.failed.push({
            itemId,
            reason: 'Invalid item type'
          });
        }

      } catch (error) {
        console.error(`Error approving item ${itemId}:`, error);
        results.failed.push({
          itemId,
          reason: 'Internal server error'
        });
      }
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Bulk approve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
