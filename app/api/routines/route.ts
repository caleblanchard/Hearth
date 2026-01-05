import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RoutineType } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';
import { parseJsonBody } from '@/lib/request-validation';

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

    // Parse pagination
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    // Fetch routines with steps and pagination
    const [routines, total] = await Promise.all([
      prisma.routine.findMany({
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
        skip,
        take: limit,
      }),
      prisma.routine.count({ where }),
    ]);

    return NextResponse.json(createPaginationResponse(routines, page, limit, total));
  } catch (error) {
    logger.error('Error fetching routines', error);
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

    // Validate and parse JSON body
    const bodyResult = await parseJsonBody(request);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status }
      );
    }
    const { name, type, assignedTo, isWeekday, isWeekend, steps } = bodyResult.data;

    // Sanitize and validate input
    const sanitizedName = sanitizeString(name);
    if (!sanitizedName || sanitizedName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Routine name is required' },
        { status: 400 }
      );
    }

    const sanitizedType = sanitizeString(type);

    if (!sanitizedType || !VALID_ROUTINE_TYPES.includes(sanitizedType)) {
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

    // Sanitize step names
    const sanitizedSteps = steps
      ? steps.map((step: any, index: number) => ({
          name: sanitizeString(step.name) || `Step ${index + 1}`,
          icon: step.icon ? sanitizeString(step.icon) : null,
          estimatedMinutes: step.estimatedMinutes ? parseInt(String(step.estimatedMinutes), 10) : null,
          sortOrder: index,
        }))
      : [];

    // Create routine with steps
    const routine = await prisma.routine.create({
      data: {
        familyId: session.user.familyId,
        name: sanitizedName,
        type: sanitizedType as RoutineType,
        assignedTo: assignedTo || null,
        isWeekday: isWeekday !== undefined ? isWeekday : true,
        isWeekend: isWeekend !== undefined ? isWeekend : true,
        steps: sanitizedSteps.length > 0
          ? {
              create: sanitizedSteps,
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
    logger.error('Error creating routine', error);
    return NextResponse.json(
      { error: 'Failed to create routine' },
      { status: 500 }
    );
  }
}
