import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { shouldProcessAllowance } from '@/lib/allowance-scheduler'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      logger.error('CRON_SECRET environment variable is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const currentDate = new Date()
    let processed = 0
    let skipped = 0
    let errors = 0

    // Fetch all active schedules with member info
    const { data: schedules } = await supabase
      .from('allowance_schedules')
      .select(`
        *,
        member:family_members!inner(
          id,
          name,
          family_id
        )
      `)
      .eq('is_active', true)

    // Process schedules in parallel batches for better performance
    const BATCH_SIZE = 20
    const batches: typeof schedules[] = []
    
    for (let i = 0; i < (schedules || []).length; i += BATCH_SIZE) {
      batches.push((schedules || []).slice(i, i + BATCH_SIZE))
    }

    // Process each batch in parallel
    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(async (schedule) => {
          // Check if this schedule should be processed today
          if (!shouldProcessAllowance(schedule, currentDate)) {
            skipped++
            return { status: 'skipped' }
          }

          // Get current balance
          const { data: balance } = await supabase
            .from('credit_balances')
            .select('*')
            .eq('member_id', schedule.member_id)
            .single()

          if (!balance) {
            logger.warn('No balance found for member', { memberId: schedule.member_id, scheduleId: schedule.id })
            errors++
            throw new Error(`No balance found for member ${schedule.member_id}`)
          }

          try {
            const newBalance = balance.current_balance + schedule.amount
            const newLifetimeEarned = balance.lifetime_earned + schedule.amount

            // Update balance
            await supabase
              .from('credit_balances')
              .update({
                current_balance: newBalance,
                lifetime_earned: newLifetimeEarned,
              })
              .eq('member_id', schedule.member_id)

            // Create transaction record
            await supabase
              .from('credit_transactions')
              .insert({
                member_id: schedule.member_id,
                type: 'BONUS',
                amount: schedule.amount,
                balance_after: newBalance,
                reason: `Allowance (${schedule.frequency})`,
                category: 'OTHER',
              })

            // Update schedule's lastProcessedAt
            await supabase
              .from('allowance_schedules')
              .update({ last_processed_at: currentDate.toISOString() })
              .eq('id', schedule.id)

            // Create notification
            const { data: member } = await supabase
              .from('family_members')
              .select('family_id')
              .eq('id', schedule.member_id)
              .single()

            if (member) {
              await supabase
                .from('notifications')
                .insert({
                  family_id: member.family_id,
                  recipient_id: schedule.member_id,
                  type: 'CREDITS_EARNED',
                  title: 'Allowance Received',
                  message: `You received ${schedule.amount} credits from your ${schedule.frequency.toLowerCase()} allowance!`,
                  is_read: false,
                })
            }

            processed++
            return { status: 'processed' }
          } catch (error) {
            logger.error('Error processing allowance', { scheduleId: schedule.id, error })
            errors++
            throw error
          }
        })
      )

      // Count errors from this batch
      for (const result of results) {
        if (result.status === 'rejected') {
          errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      skipped,
      errors,
      totalSchedules: schedules?.length || 0,
      timestamp: currentDate.toISOString(),
    })
  } catch (error) {
    logger.error('Distribute allowances cron error', error)
    return NextResponse.json(
      {
        error: 'Failed to distribute allowances',
      },
      { status: 500 }
    )
  }
}
