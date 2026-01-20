import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processGraceRepayment } from '@/lib/screentime-grace';
import { logger } from '@/lib/logger';

/**
 * Weekly Screen Time Reset Cron Job
 *
 * This endpoint should be called weekly (typically Sunday at midnight) to:
 * 1. Reset screen time balances to weekly allocations
 * 2. Process grace period repayments based on repayment mode
 * 3. Create audit logs for the reset
 *
 * Expected to be triggered by a cron service (e.g., Vercel Cron, GitHub Actions)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();
    let balancesReset = 0;
    let graceRepaymentsProcessed = 0;
    let totalGraceMinutesRepaid = 0;
    let errors = 0;

    // Get all screen time balances
    const { data: balances } = await supabase
      .from('screen_time_balances')
      .select(`
        *,
        member:family_members!inner(
          id,
          name,
          family_id
        )
      `);

    // Process each balance
    for (const balance of balances || []) {
      try {
        // Process grace repayments BEFORE resetting balance
        const repaymentResult = await processGraceRepayment(balance.member_id);
        if (repaymentResult.logsProcessed > 0) {
          graceRepaymentsProcessed += repaymentResult.logsProcessed;
          totalGraceMinutesRepaid += repaymentResult.totalRepaid;
        }

        // Get updated balance after repayment (might have been deducted)
        const { data: updatedBalance } = await supabase
          .from('screen_time_balances')
          .select(`
            *,
            member:family_members!inner(
              screen_time_settings:screen_time_settings(
                weekly_allocation_minutes
              )
            )
          `)
          .eq('member_id', balance.member_id)
          .single();

        const settings = (updatedBalance?.member?.screen_time_settings as any)?.[0];
        if (!updatedBalance || !settings) {
          throw new Error(`Balance or settings not found for member ${balance.member_id}`);
        }

        const weeklyAllocation = settings.weekly_allocation_minutes;

        // Reset to weekly allocation
        await supabase
          .from('screen_time_balances')
          .update({
            current_balance_minutes: weeklyAllocation,
            week_start_date: now.toISOString(),
          })
          .eq('member_id', balance.member_id);

        // Create transaction record for the reset
        await supabase
          .from('screen_time_transactions')
          .insert({
            member_id: balance.member_id,
            type: 'ALLOCATION',
            amount_minutes: weeklyAllocation,
            balance_after: weeklyAllocation,
            reason: 'Weekly reset',
            created_by_id: balance.member_id, // System reset
          });

        // Create audit log
        await supabase
          .from('audit_logs')
          .insert({
            family_id: balance.member.family_id,
            member_id: balance.member_id,
            action: 'SCREENTIME_ADJUSTED',
            entity_type: 'SCREEN_TIME',
            result: 'SUCCESS',
            details: {
              memberName: balance.member.name,
              weeklyAllocationMinutes: weeklyAllocation,
              previousBalance: balance.current_balance_minutes,
              graceRepaymentsProcessed: repaymentResult.logsProcessed,
              graceMinutesRepaid: repaymentResult.totalRepaid,
            },
          });

        // Create notification for the reset
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: balance.member_id,
            type: 'SCREENTIME_ADJUSTED',
            title: 'Screen Time Reset',
            message: `Your screen time has been reset to ${weeklyAllocation} minutes for the week!`,
            is_read: false,
          });

        balancesReset++;
      } catch (error) {
        logger.error('Error processing screen time reset for member', {
          memberId: balance.member_id,
          memberName: balance.member.name,
          error,
        });
        errors++;
      }
    }

    const response = {
      success: true,
      balancesReset,
      graceRepaymentsProcessed,
      totalGraceMinutesRepaid,
      errors,
      totalMembers: balances?.length || 0,
      timestamp: now.toISOString(),
    };

    logger.info('Screen time weekly reset completed', response);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Screen time weekly reset cron error', error);
    return NextResponse.json(
      {
        error: 'Failed to process weekly screen time reset',
      },
      { status: 500 }
    );
  }
}
