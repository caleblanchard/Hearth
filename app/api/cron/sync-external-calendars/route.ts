/**
 * External Calendar Sync Cron Job
 *
 * GET/POST /api/cron/sync-external-calendars
 * Syncs all active external calendar subscriptions that are due for sync.
 * This endpoint should be called periodically (e.g., every hour) to keep
 * external calendars up to date.
 *
 * Protected by CRON_SECRET environment variable.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { syncExternalCalendar } from '@/lib/integrations/external-calendar';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (if configured)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('Unauthorized cron request', {
        hasAuth: !!authHeader,
        hasSecret: !!cronSecret,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();

    // Find all active subscriptions that are due for sync
    const now = new Date();
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('external_calendar_subscriptions')
      .select('*')
      .eq('is_active', true)
      .or(`next_sync_at.lte.${now.toISOString()},next_sync_at.is.null`)
      .order('next_sync_at', { ascending: true });

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    logger.info('Starting external calendar sync cron job', {
      subscriptionCount: subscriptions?.length || 0,
    });

    const results = {
      total: subscriptions?.length || 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        subscriptionId: string;
        name: string;
        status: 'success' | 'error' | 'skipped';
        eventsCreated?: number;
        eventsUpdated?: number;
        eventsDeleted?: number;
        error?: string;
      }>,
    };

    // Sync each subscription
    for (const subscription of subscriptions || []) {
      try {
        const result = await syncExternalCalendar(subscription.id, supabase);

        if (result.success) {
          results.successful++;
          results.details.push({
            subscriptionId: subscription.id,
            name: subscription.name,
            status: 'success',
            eventsCreated: result.eventsCreated,
            eventsUpdated: result.eventsUpdated,
            eventsDeleted: result.eventsDeleted,
          });
        } else {
          results.failed++;
          results.details.push({
            subscriptionId: subscription.id,
            name: subscription.name,
            status: 'error',
            error: result.error,
          });
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.details.push({
          subscriptionId: subscription.id,
          name: subscription.name,
          status: 'error',
          error: errorMessage,
        });
        logger.error('Failed to sync subscription in cron job', {
          subscriptionId: subscription.id,
          error: errorMessage,
        });
      }
    }

    logger.info('External calendar sync cron job completed', {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
    });

    return NextResponse.json(
      {
        message: 'Sync completed',
        ...results,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('External calendar sync cron job failed', { error });
    return NextResponse.json(
      { error: 'Failed to sync external calendars' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
