import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
import {
  calculateAnalytics,
  getSpendingByCategory,
  getTrends,
} from '@/lib/financial-analytics'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const period = searchParams.get('period') || 'monthly' // 'weekly' or 'monthly'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build where clause
    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
    }

    // Children can only see their own data
    if (session.user.role === 'CHILD') {
      where.memberId = session.user.id
    } else if (memberId) {
      where.memberId = memberId
    }

    // Add date filters if provided
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Fetch transactions
    const transactions = await prisma.creditTransaction.findMany({
      where,
      select: {
        id: true,
        type: true,
        amount: true,
        category: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate analytics
    const summary = calculateAnalytics(transactions)
    const spendingByCategory = getSpendingByCategory(transactions)
    const trends = getTrends(
      transactions,
      period === 'weekly' ? 'weekly' : 'monthly'
    )

    return NextResponse.json({
      summary,
      spendingByCategory,
      trends,
      period,
    })
  } catch (error) {
    logger.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
