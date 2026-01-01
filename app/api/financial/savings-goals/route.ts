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
    }

    // Children can only see their own goals
    if (session.user.role === 'CHILD') {
      where.memberId = session.user.id
    }

    const goals = await prisma.savingsGoal.findMany({
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
    })

    return NextResponse.json({ goals })
  } catch (error) {
    console.error('Savings goals API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch savings goals' },
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

    const body = await request.json()
    const { memberId, name, description, targetAmount, iconName, color, deadline } = body

    // Validate
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be positive' },
        { status: 400 }
      )
    }

    // Determine memberId
    let goalMemberId = memberId
    if (session.user.role === 'CHILD') {
      // Children can only create goals for themselves
      goalMemberId = session.user.id
    } else if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Verify member belongs to family
    const member = await prisma.familyMember.findUnique({
      where: { id: goalMemberId },
      select: { familyId: true },
    })

    if (!member || member.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }

    // Create goal
    const goal = await prisma.savingsGoal.create({
      data: {
        memberId: goalMemberId,
        name: name.trim(),
        description: description || null,
        targetAmount,
        iconName: iconName || 'currency-dollar',
        color: color || 'blue',
        deadline: deadline ? new Date(deadline) : null,
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
        goal,
        message: 'Savings goal created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create savings goal error:', error)
    return NextResponse.json(
      { error: 'Failed to create savings goal' },
      { status: 500 }
    )
  }
}
