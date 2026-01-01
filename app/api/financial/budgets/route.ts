import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = {
      member: {
        familyId: session.user.familyId,
      },
      isActive: true,
    }

    // Children can only see their own budgets
    if (session.user.role === 'CHILD') {
      where.memberId = session.user.id
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
        periods: {
          orderBy: {
            periodStart: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ budgets })
  } catch (error) {
    console.error('Budgets API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only parents can create budgets
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { memberId, category, limitAmount, period, resetDay } = body

    // Validate
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    if (!limitAmount || limitAmount <= 0) {
      return NextResponse.json(
        { error: 'Limit amount must be positive' },
        { status: 400 }
      )
    }

    if (!period || !['weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: 'Period must be "weekly" or "monthly"' },
        { status: 400 }
      )
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { familyId: true },
    })

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }

    // Check for existing budget
    const existing = await prisma.budget.findFirst({
      where: {
        memberId,
        category,
        period,
        isActive: true,
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error: `An active ${period} budget for ${category} already exists for this member`,
        },
        { status: 409 }
      )
    }

    // Create budget
    const budget = await prisma.budget.create({
      data: {
        memberId,
        category,
        limitAmount,
        period,
        resetDay: resetDay || 0,
        isActive: true,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        budget,
        message: 'Budget created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create budget error:', error)
    return NextResponse.json(
      { error: 'Failed to create budget' },
      { status: 500 }
    )
  }
}
