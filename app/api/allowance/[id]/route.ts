import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { Frequency } from '@/app/generated/prisma'
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { familyId } = session.user

    // Fetch schedule and verify family ownership
    const schedule = await prisma.allowanceSchedule.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            familyId: true,
          },
        },
      },
    })

    if (!schedule || schedule.member.familyId !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    logger.error('Get allowance schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch allowance schedule' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only parents can update allowance schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { familyId } = session.user

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.allowanceSchedule.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            familyId: true,
          },
        },
      },
    })

    if (!existingSchedule || existingSchedule.member.familyId !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { amount, frequency, dayOfWeek, dayOfMonth, startDate, endDate } = body

    // Validate amount if provided
    if (amount !== undefined && amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    // Validate frequency-specific fields if frequency is being updated
    if (frequency) {
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
    }

    // Build update data
    const updateData: any = {}
    if (amount !== undefined) updateData.amount = amount
    if (frequency) {
      updateData.frequency = frequency as Frequency
      updateData.dayOfWeek =
        frequency === 'WEEKLY' || frequency === 'BIWEEKLY' ? dayOfWeek : null
      updateData.dayOfMonth = frequency === 'MONTHLY' ? dayOfMonth : null
    }
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

    // Update the schedule
    const schedule = await prisma.allowanceSchedule.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      schedule,
      message: 'Allowance schedule updated successfully',
    })
  } catch (error) {
    logger.error('Update allowance schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to update allowance schedule' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only parents can pause/resume schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { familyId } = session.user

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.allowanceSchedule.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            familyId: true,
          },
        },
      },
    })

    if (!existingSchedule || existingSchedule.member.familyId !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { isPaused } = body

    if (isPaused === undefined) {
      return NextResponse.json(
        { error: 'isPaused field is required' },
        { status: 400 }
      )
    }

    // Update pause status
    const schedule = await prisma.allowanceSchedule.update({
      where: { id: params.id },
      data: { isPaused },
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

    return NextResponse.json({
      success: true,
      schedule,
      message: isPaused
        ? 'Allowance schedule paused'
        : 'Allowance schedule resumed',
    })
  } catch (error) {
    logger.error('Patch allowance schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to update allowance schedule' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only parents can delete schedules
    if (session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { familyId } = session.user

    // Verify schedule exists and belongs to family
    const existingSchedule = await prisma.allowanceSchedule.findUnique({
      where: { id: params.id },
      include: {
        member: {
          select: {
            familyId: true,
          },
        },
      },
    })

    if (!existingSchedule || existingSchedule.member.familyId !== familyId) {
      return NextResponse.json(
        { error: 'Allowance schedule not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.allowanceSchedule.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Allowance schedule deactivated successfully',
    })
  } catch (error) {
    logger.error('Delete allowance schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to delete allowance schedule' },
      { status: 500 }
    )
  }
}
