import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Frequency } from '@/app/generated/prisma'
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { familyId } = session.user

    // Fetch all allowance schedules for the family
    const schedules = await prisma.allowanceSchedule.findMany({
      where: {
        member: {
          familyId,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ schedules })
  } catch (error) {
    logger.error('Allowance schedules API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch allowance schedules' },
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

    // Only parents can create allowance schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      memberId,
      amount,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
    } = body

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    if (!frequency) {
      return NextResponse.json(
        { error: 'Frequency is required' },
        { status: 400 }
      )
    }

    // Validate frequency-specific fields
    if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
      if (dayOfWeek === null || dayOfWeek === undefined) {
        return NextResponse.json(
          { error: 'dayOfWeek is required for WEEKLY/BIWEEKLY frequency' },
          { status: 400 }
        )
      }
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' },
          { status: 400 }
        )
      }
    }

    if (frequency === 'MONTHLY') {
      if (dayOfMonth === null || dayOfMonth === undefined) {
        return NextResponse.json(
          { error: 'dayOfMonth is required for MONTHLY frequency' },
          { status: 400 }
        )
      }
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        return NextResponse.json(
          { error: 'dayOfMonth must be between 1 and 31' },
          { status: 400 }
        )
      }
    }

    const { familyId } = session.user

    // Verify member exists and belongs to the same family
    const member = await prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { id: true, familyId: true },
    })

    if (!member || member.familyId !== familyId) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      )
    }

    // Check for existing active schedule
    const existingSchedule = await prisma.allowanceSchedule.findFirst({
      where: {
        memberId,
        isActive: true,
      },
    })

    if (existingSchedule) {
      return NextResponse.json(
        { error: 'This member already has an active allowance schedule' },
        { status: 409 }
      )
    }

    // Create the allowance schedule
    const schedule = await prisma.allowanceSchedule.create({
      data: {
        memberId,
        amount,
        frequency: frequency as Frequency,
        dayOfWeek:
          frequency === 'WEEKLY' || frequency === 'BIWEEKLY'
            ? dayOfWeek
            : null,
        dayOfMonth: frequency === 'MONTHLY' ? dayOfMonth : null,
        isActive: true,
        isPaused: false,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        schedule,
        message: 'Allowance schedule created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Create allowance schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to create allowance schedule' },
      { status: 500 }
    )
  }
}
