import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { shouldProcessAllowance } from '@/lib/allowance-scheduler'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret) {
      console.error('CRON_SECRET environment variable is not set')
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

    const currentDate = new Date()
    let processed = 0
    let skipped = 0
    let errors = 0

    // Fetch all active schedules with member info
    const schedules = await prisma.allowanceSchedule.findMany({
      where: {
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            familyId: true,
          },
        },
      },
    })

    // Process schedules in parallel batches for better performance
    const BATCH_SIZE = 20 // TODO: Move to constants
    const batches: typeof schedules[] = []
    
    for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
      batches.push(schedules.slice(i, i + BATCH_SIZE))
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
          const balance = await prisma.creditBalance.findUnique({
            where: { memberId: schedule.memberId },
          })

          if (!balance) {
            console.error(`No balance found for member ${schedule.memberId}`)
            errors++
            throw new Error(`No balance found for member ${schedule.memberId}`)
          }

          // Process allowance in a transaction
          await prisma.$transaction(async (tx) => {
            const newBalance = balance.currentBalance + schedule.amount
            const newLifetimeEarned = balance.lifetimeEarned + schedule.amount

            // Update balance
            await tx.creditBalance.update({
              where: { memberId: schedule.memberId },
              data: {
                currentBalance: newBalance,
                lifetimeEarned: newLifetimeEarned,
              },
            })

            // Create transaction record
            await tx.creditTransaction.create({
              data: {
                memberId: schedule.memberId,
                type: 'BONUS',
                amount: schedule.amount,
                balanceAfter: newBalance,
                reason: `Allowance (${schedule.frequency})`,
                category: 'OTHER',
              },
            })

            // Update schedule's lastProcessedAt
            await tx.allowanceSchedule.update({
              where: { id: schedule.id },
              data: { lastProcessedAt: currentDate },
            })

            // Create notification
            await tx.notification.create({
              data: {
                userId: schedule.memberId,
                type: 'CREDITS_EARNED',
                title: 'Allowance Received',
                message: `You received ${schedule.amount} credits from your ${schedule.frequency.toLowerCase()} allowance!`,
                isRead: false,
              },
            })
          })

          processed++
          return { status: 'processed' }
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
      totalSchedules: schedules.length,
      timestamp: currentDate.toISOString(),
    })
  } catch (error) {
    console.error('Distribute allowances cron error:', error)
    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: 'Failed to distribute allowances',
      },
      { status: 500 }
    )
  }
}
