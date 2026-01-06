import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50', 10)),
      100  // Maximum limit
    )

    // Build where clause
    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
    }

    // Children can only see their own transactions
    if (session.user.role === 'CHILD') {
      where.memberId = session.user.id
    } else if (memberId) {
      // Parents can filter by specific member - verify family membership
      const member = await prisma.familyMember.findUnique({
        where: { id: memberId },
        select: { familyId: true },
      })

      if (!member || member.familyId !== session.user.familyId) {
        return NextResponse.json(
          { error: 'Invalid member or member does not belong to your family' },
          { status: 403 }
        )
      }
      where.memberId = memberId
    }

    // Add filters
    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (startDate || endDate) {
      // Validate date range
      if (startDate && endDate) {
        const start = new Date(startDate)
        const end = new Date(endDate)
        
        if (start > end) {
          return NextResponse.json(
            { error: 'Start date must be before end date' },
            { status: 400 }
          )
        }
        
        // Limit date range to 1 year
        const maxRange = 365 * 24 * 60 * 60 * 1000 // TODO: Import from constants
        if (end.getTime() - start.getTime() > maxRange) {
          return NextResponse.json(
            { error: 'Date range cannot exceed 1 year' },
            { status: 400 }
          )
        }
      }
      
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Get total count for pagination
    const total = await prisma.creditTransaction.count({ where })

    // Fetch transactions with pagination
    const transactions = await prisma.creditTransaction.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Transactions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
