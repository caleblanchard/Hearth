import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getFamilyId } from '@/lib/api-auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guests can view dashboard but with limited data
    if (authResult.isGuest) {
      // For guests, return limited dashboard data
      const familyId = getFamilyId(authResult);
      
      // Get basic family info only
      const family = await prisma.family.findUnique({
        where: { id: familyId },
        select: {
          name: true,
          members: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
      });

      return NextResponse.json({
        chores: [],
        screenTime: null,
        credits: null,
        shopping: null,
        todos: [],
        events: [],
        projectTasks: [],
        family: family,
        isGuest: true,
        guestAccessLevel: authResult.guest?.accessLevel,
      });
    }

    const { familyId, id: memberId } = authResult.user!;

    // Fetch all pending/rejected chores for the user (regardless of due date)
    // This ensures chores show up even if dueDate isn't set correctly or instances weren't generated for today
    const chores = await prisma.choreInstance.findMany({
      where: {
        assignedToId: memberId,
        status: {
          in: ['PENDING', 'REJECTED'],
        },
      },
      include: {
        choreSchedule: {
          include: {
            choreDefinition: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Fetch screen time balance
    const screenTimeBalance = await prisma.screenTimeBalance.findUnique({
      where: {
        memberId,
      },
      include: {
        member: {
          include: {
            screenTimeSettings: true,
          },
        },
      },
    });

    // Fetch screen time allowances with remaining time calculations
    const allowances = await prisma.screenTimeAllowance.findMany({
      where: {
        memberId,
        screenTimeType: {
          isActive: true,
          isArchived: false,
        },
      },
      include: {
        screenTimeType: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Calculate remaining time for each allowance
    const allowancesWithRemaining = await Promise.all(
      allowances.map(async (allowance) => {
        try {
          const { calculateRemainingTime } = await import('@/lib/screentime-utils');
          const remaining = await calculateRemainingTime(memberId, allowance.screenTimeTypeId);
          return {
            id: allowance.id,
            screenTimeTypeId: allowance.screenTimeTypeId,
            screenTimeTypeName: allowance.screenTimeType.name,
            allowanceMinutes: allowance.allowanceMinutes,
            period: allowance.period,
            remainingMinutes: remaining.remainingMinutes,
            usedMinutes: remaining.usedMinutes,
            rolloverMinutes: remaining.rolloverMinutes,
          };
        } catch (error) {
          // If calculation fails, return basic info
          logger.warn('Failed to calculate remaining time for allowance', {
            error: error instanceof Error ? error.message : String(error),
            allowanceId: allowance.id,
            memberId,
          });
          return {
            id: allowance.id,
            screenTimeTypeId: allowance.screenTimeTypeId,
            screenTimeTypeName: allowance.screenTimeType.name,
            allowanceMinutes: allowance.allowanceMinutes,
            period: allowance.period,
            remainingMinutes: allowance.allowanceMinutes,
            usedMinutes: 0,
            rolloverMinutes: 0,
          };
        }
      })
    );

    // Fetch credit balance
    const creditBalance = await prisma.creditBalance.findUnique({
      where: {
        memberId,
      },
    });

    // Fetch shopping list
    const shoppingLists = await prisma.shoppingList.findMany({
      where: {
        familyId,
        isActive: true,
      },
      include: {
        items: {
          where: {
            status: {
              in: ['PENDING', 'IN_CART'],
            },
          },
          orderBy: {
            priority: 'desc',
          },
        },
      },
      take: 1,
    });

    // Fetch to-do items
    const todos = await prisma.todoItem.findMany({
      where: {
        OR: [
          { assignedToId: memberId },
          { AND: [{ assignedToId: null }, { familyId }] },
        ],
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: 5,
    });

    // Fetch upcoming calendar events
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        familyId,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        assignments: {
          where: {
            memberId,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      take: 5,
    });

    // Filter events that are assigned to the user
    const myEvents = calendarEvents.filter(event =>
      event.assignments.length > 0 || authResult.user!.role === 'PARENT'
    );

    // Fetch project tasks assigned to the user
    const projectTasks = await prisma.projectTask.findMany({
      where: {
        assigneeId: memberId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'],
        },
        project: {
          familyId,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 5,
    });

    return NextResponse.json({
      chores: chores.map(chore => ({
        id: chore.id,
        name: chore.choreSchedule.choreDefinition.name,
        description: chore.choreSchedule.choreDefinition.description,
        status: chore.status,
        creditValue: chore.choreSchedule.choreDefinition.creditValue,
        difficulty: chore.choreSchedule.choreDefinition.difficulty,
        dueDate: chore.dueDate,
        requiresApproval: chore.choreSchedule.requiresApproval,
      })),
      screenTime: allowancesWithRemaining.length > 0 ? {
        // Calculate totals from type-specific allowances
        currentBalance: allowancesWithRemaining.reduce((sum, a) => sum + a.remainingMinutes, 0),
        weeklyAllocation: allowancesWithRemaining
          .filter((a) => a.period === 'WEEKLY')
          .reduce((sum, a) => sum + a.allowanceMinutes, 0),
        weekStartDate: screenTimeBalance?.weekStartDate,
        allowances: allowancesWithRemaining,
      } : null,
      credits: creditBalance ? {
        current: creditBalance.currentBalance,
        lifetimeEarned: creditBalance.lifetimeEarned,
        lifetimeSpent: creditBalance.lifetimeSpent,
      } : null,
      shopping: shoppingLists[0] ? {
        id: shoppingLists[0].id,
        name: shoppingLists[0].name,
        itemCount: shoppingLists[0].items.length,
        urgentCount: shoppingLists[0].items.filter(item => item.priority === 'URGENT').length,
        items: shoppingLists[0].items.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          priority: item.priority,
          category: item.category,
        })),
      } : null,
      todos: todos.map(todo => ({
        id: todo.id,
        title: todo.title,
        priority: todo.priority,
        dueDate: todo.dueDate,
        status: todo.status,
      })),
      events: myEvents.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        color: event.color,
      })),
      projectTasks: projectTasks.map(task => ({
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status,
        dueDate: task.dueDate,
        projectId: task.projectId,
        projectName: task.project.name,
      })),
      isGuest: false,
    });
  } catch (error) {
    logger.error('Dashboard API error', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
