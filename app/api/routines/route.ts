import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RoutineType } from '@/app/generated/prisma';

const VALID_ROUTINE_TYPES = ['MORNING', 'BEDTIME', 'HOMEWORK', 'AFTER_SCHOOL', 'CUSTOM'];

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assignedTo');

    // Build query filters
    const where: any = {
      familyId: session.user.familyId,
    };

    // Filter by type if provided
    if (type) {
      where.type = type as RoutineType;
    }

    // Filter by assignedTo if provided
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // For children, show routines assigned to them or unassigned (available to all)
    if (session.user.role === 'CHILD') {
      where.OR = [
        { assignedTo: session.user.id },
        { assignedTo: null },
      ];
    }

    // Fetch routines with steps
    const routines = await prisma.routine.findMany({
      where,
      include: {
        steps: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      routines,
    });
  } catch (error) {
    console.error('Error fetching routines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routines' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only parents can create routines
    if (session.user.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'Only parents can create routines' },
        { status: 403 }
      );
    }

    // Validate JSON input
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { name, type, assignedTo, isWeekday, isWeekend, steps } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Routine name is required' },
        { status: 400 }
      );
    }

    if (!type || !VALID_ROUTINE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Valid routine type is required (MORNING, BEDTIME, HOMEWORK, AFTER_SCHOOL, CUSTOM)' },
        { status: 400 }
      );
    }

    // Validate assignedTo if provided
    if (assignedTo) {
      const member = await prisma.familyMember.findFirst({
        where: {
          id: assignedTo,
          familyId: session.user.familyId,
        },
      });

      if (!member) {
        return NextResponse.json(
          { error: 'Assigned member must be a valid family member' },
          { status: 400 }
        );
      }
    }

    // Create routine with steps
    const routine = await prisma.routine.create({
      data: {
        familyId: session.user.familyId,
        name: name.trim(),
        type: type as RoutineType,
        assignedTo: assignedTo || null,
        isWeekday: isWeekday !== undefined ? isWeekday : true,
        isWeekend: isWeekend !== undefined ? isWeekend : true,
        steps: steps
          ? {
              create: steps.map((step: any, index: number) => ({
                name: step.name,
                icon: step.icon || null,
                estimatedMinutes: step.estimatedMinutes || null,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        familyId: session.user.familyId,
        memberId: session.user.id,
        action: 'ROUTINE_CREATED',
        result: 'SUCCESS',
        metadata: {
          routineId: routine.id,
          routineName: routine.name,
          routineType: routine.type,
        },
      },
    });

    return NextResponse.json(
      {
        routine,
        message: 'Routine created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating routine:', error);
    return NextResponse.json(
      { error: 'Failed to create routine' },
      { status: 500 }
    );
  }
}
