import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/lib/input-sanitization';
import { parsePaginationParams, createPaginationResponse } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    // Parse pagination parameters
    const { page, limit } = parsePaginationParams(request.nextUrl.searchParams);
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.choreDefinition.count({
      where: {
        familyId: session.user.familyId,
      },
    });

    const chores = await prisma.choreDefinition.findMany({
      where: {
        familyId: session.user.familyId,
      },
      include: {
        schedules: {
          include: {
            assignments: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
              where: {
                isActive: true,
              },
              orderBy: {
                rotationOrder: 'asc',
              },
            },
            _count: {
              select: {
                instances: true,
              },
            },
          },
          where: {
            isActive: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      skip,
      take: limit,
    });

    return NextResponse.json(createPaginationResponse(chores, page, limit, total));
  } catch (error) {
    logger.error('Error fetching chores', error);
    return NextResponse.json({ error: 'Failed to fetch chores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name: rawName,
      description: rawDescription,
      creditValue: rawCreditValue,
      difficulty: rawDifficulty,
      estimatedMinutes: rawEstimatedMinutes,
      minimumAge: rawMinimumAge,
      iconName: rawIconName,
      schedule,
    } = body;

    // Sanitize and validate input
    const name = sanitizeString(rawName);
    if (!name || name.length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
    }

    const description = rawDescription ? sanitizeString(rawDescription) : null;
    const iconName = rawIconName ? sanitizeString(rawIconName) : null;

    const creditValue = rawCreditValue != null ? parseInt(String(rawCreditValue), 10) : 0;
    if (isNaN(creditValue) || creditValue < 0) {
      return NextResponse.json({ error: 'Credit value must be 0 or greater' }, { status: 400 });
    }

    const estimatedMinutes = rawEstimatedMinutes ? parseInt(String(rawEstimatedMinutes), 10) : null;
    if (!estimatedMinutes || estimatedMinutes <= 0) {
      return NextResponse.json({ error: 'Estimated minutes must be greater than 0' }, { status: 400 });
    }

    const minimumAge = rawMinimumAge ? parseInt(String(rawMinimumAge), 10) : null;
    if (minimumAge !== null && (isNaN(minimumAge) || minimumAge < 0)) {
      return NextResponse.json({ error: 'Minimum age must be 0 or greater' }, { status: 400 });
    }

    const difficulty = sanitizeString(rawDifficulty);
    if (!difficulty || !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return NextResponse.json({ error: 'Difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
    }
    // Type assertion: we've validated it's one of the enum values
    const difficultyEnum = difficulty as 'EASY' | 'MEDIUM' | 'HARD';

    // Schedule validation
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule is required' }, { status: 400 });
    }

    if (!['FIXED', 'ROTATING', 'OPT_IN'].includes(schedule.assignmentType)) {
      return NextResponse.json({ error: 'Invalid assignment type' }, { status: 400 });
    }

    if (!['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'].includes(schedule.frequency)) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    if ((schedule.frequency === 'WEEKLY' || schedule.frequency === 'BIWEEKLY') && schedule.dayOfWeek == null) {
      return NextResponse.json({ error: 'Day of week is required for weekly/biweekly schedules' }, { status: 400 });
    }

    if (schedule.frequency === 'CUSTOM' && !schedule.customCron) {
      return NextResponse.json({ error: 'Custom cron expression is required for custom frequency' }, { status: 400 });
    }

    // Assignments validation
    if (!schedule.assignments || schedule.assignments.length === 0) {
      return NextResponse.json({ error: 'At least one assignment is required' }, { status: 400 });
    }

    if (schedule.assignmentType === 'ROTATING' && schedule.assignments.length < 2) {
      return NextResponse.json({ error: 'Rotating assignments require at least 2 members' }, { status: 400 });
    }

    // Validate rotation order if ROTATING
    if (schedule.assignmentType === 'ROTATING') {
      const rotationOrders = schedule.assignments.map((a: any) => a.rotationOrder).sort((a: number, b: number) => a - b);
      for (let i = 0; i < rotationOrders.length; i++) {
        if (rotationOrders[i] !== i) {
          return NextResponse.json({ error: 'Rotation order must be sequential starting from 0' }, { status: 400 });
        }
      }
    }

    // Create chore, schedule, and assignments atomically
    const result = await prisma.$transaction(async (tx) => {
      const definition = await tx.choreDefinition.create({
        data: {
          familyId: session.user.familyId,
          name,
          description,
          creditValue,
          difficulty: difficultyEnum,
          estimatedMinutes,
          minimumAge: minimumAge || undefined,
          iconName: iconName || undefined,
          isActive: true,
        },
      });

      const choreSchedule = await tx.choreSchedule.create({
        data: {
          choreDefinitionId: definition.id,
          assignmentType: schedule.assignmentType,
          frequency: schedule.frequency,
          dayOfWeek: schedule.dayOfWeek ?? null,
          customCron: schedule.customCron || null,
          requiresApproval: schedule.requiresApproval ?? false,
          requiresPhoto: schedule.requiresPhoto ?? false,
          isActive: true,
        },
      });

      await tx.choreAssignment.createMany({
        data: schedule.assignments.map((assignment: any) => ({
          choreScheduleId: choreSchedule.id,
          memberId: assignment.memberId,
          rotationOrder: assignment.rotationOrder ?? null,
          isActive: true,
        })),
      });

      // Fetch the complete chore with relationships
      const completeChore = await tx.choreDefinition.findUnique({
        where: { id: definition.id },
        include: {
          schedules: {
            include: {
              assignments: {
                include: {
                  member: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return completeChore;
    });

    return NextResponse.json({
      success: true,
      chore: result,
      message: 'Chore created successfully',
    });
  } catch (error) {
    logger.error('Error creating chore', error);
    return NextResponse.json({ error: 'Failed to create chore' }, { status: 500 });
  }
}
