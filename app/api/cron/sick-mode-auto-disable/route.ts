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
    const { data: settingsWithAutoDisable } = await supabase
      .from('sick_mode_settings')
      .select('family_id, auto_disable_after_24_hours')
      .eq('auto_disable_after_24_hours', true);

    if (!settingsWithAutoDisable || settingsWithAutoDisable.length === 0) {
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
            entity_type: 'SICK_MODE',
            entity_id: instance.id,
            details: {
              reason: `Auto-disabled after ${hoursThreshold} hours`,
              memberName: instance.member.name,
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
