import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Cron job to auto-disable sick mode instances after configured duration
 * Run every hour: 0 * * * *
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Sick mode auto-disable cron job started');

    const supabase = await createClient();

    // Get all families with auto-disable configured
    const { data: settings } = await supabase
      .from('sick_mode_settings')
      .select('*');

    const settingsWithAutoDisable =
      settings?.filter((entry: any) => {
        const hours =
          entry.auto_disable_after_hours ??
          entry.autoDisableAfterHours ??
          (entry.auto_disable_after_24_hours ? 24 : null) ??
          (entry.autoDisableAfter24Hours ? 24 : null);
        return typeof hours === 'number' && hours > 0;
      }) || [];

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
      const hoursThreshold = settings.auto_disable_after_24_hours ? 24 : null;

      if (!hoursThreshold) {
        continue;
      }

      const cutoffTime = new Date(now.getTime() - hoursThreshold * 60 * 60 * 1000);

      // Find active instances that started before the cutoff
      const { data: expiredInstances } = await (supabase as any)
        .from('sick_mode_instances')
        .select(`
          *,
          member:family_members!member_id(
            id,
            name
          )
        `)
        .eq('family_id', settings.family_id)
        .eq('is_active', true)
        .lt('started_at', cutoffTime.toISOString());

      // Disable each expired instance
      for (const instance of expiredInstances || []) {
        await supabase
          .from('sick_mode_instances')
          .update({
            is_active: false,
            ended_at: now.toISOString(),
          })
          .eq('id', instance.id);

        // Create audit log
        await supabase
          .from('audit_logs')
          .insert({
            family_id: instance.family_id,
            member_id: instance.member_id,
            action: 'SICK_MODE_ENDED',
            result: 'SUCCESS',
            metadata: {
              reason: `Auto-disabled after ${hoursThreshold} hours`,
              memberName: instance.member?.name,
            },
          });

        disabledInstances.push({
          id: instance.id,
          familyId: instance.family_id,
          memberId: instance.member_id,
          memberName: instance.member.name,
          startedAt: instance.started_at,
          durationHours: Math.round(
            (now.getTime() - new Date(instance.started_at).getTime()) / (60 * 60 * 1000)
          ),
        });

        logger.info(`Auto-disabled sick mode for ${instance.member.name}`, {
          instanceId: instance.id,
          familyId: instance.family_id,
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
