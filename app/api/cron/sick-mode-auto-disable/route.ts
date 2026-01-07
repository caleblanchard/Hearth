import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * Cron job to auto-disable sick mode instances after configured duration
 * Run every hour: 0 * * * *
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Sick mode auto-disable cron job started');

    // Get all families with auto-disable configured
    const settingsWithAutoDisable = await prisma.sickModeSettings.findMany({
      where: {
        autoDisableAfter24Hours: true,
      },
      select: {
        familyId: true,
        autoDisableAfter24Hours: true,
      },
    });

    if (settingsWithAutoDisable.length === 0) {
      logger.info('No families have auto-disable configured');
      return NextResponse.json({
        success: true,
        disabledCount: 0,
        disabledInstances: [],
      });
    }

    const now = new Date();
    const disabledInstances: any[] = [];

    // Process each family
    for (const settings of settingsWithAutoDisable) {
      // Auto-disable is set to 24 hours
      const hoursThreshold = 24;
      const cutoffTime = new Date(now.getTime() - hoursThreshold * 60 * 60 * 1000);

      // Find active instances that started before the cutoff
      const expiredInstances = await prisma.sickModeInstance.findMany({
        where: {
          familyId: settings.familyId,
          isActive: true,
          startedAt: {
            lt: cutoffTime,
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Disable each expired instance
      for (const instance of expiredInstances) {
        await prisma.sickModeInstance.update({
          where: { id: instance.id },
          data: {
            isActive: false,
            endedAt: now,
          },
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            familyId: instance.familyId,
            memberId: instance.memberId,
            action: 'SICK_MODE_ENDED',
            entityType: 'SICK_MODE',
            entityId: instance.id,
            metadata: {
              reason: `Auto-disabled after ${hoursThreshold} hours`,
              memberName: instance.member.name,
            },
          },
        });

        disabledInstances.push({
          id: instance.id,
          familyId: instance.familyId,
          memberId: instance.memberId,
          memberName: instance.member.name,
          startedAt: instance.startedAt,
          durationHours: Math.round(
            (now.getTime() - instance.startedAt.getTime()) / (60 * 60 * 1000)
          ),
        });

        logger.info(`Auto-disabled sick mode for ${instance.member.name}`, {
          instanceId: instance.id,
          familyId: instance.familyId,
          durationHours: hoursThreshold,
        });
      }
    }

    logger.info(`Sick mode auto-disable completed: ${disabledInstances.length} instances disabled`);

    return NextResponse.json({
      success: true,
      disabledCount: disabledInstances.length,
      disabledInstances,
    });
  } catch (error) {
    logger.error('Sick mode auto-disable cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to auto-disable sick mode instances',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
