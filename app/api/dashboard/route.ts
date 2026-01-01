import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { familyId, id: memberId } = session.user;

    // Fetch today's chores for the user
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const chores = await prisma.choreInstance.findMany({
      where: {
        assignedToId: memberId,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        choreSchedule: {
          include: {
            choreDefinition: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
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
      event.assignments.length > 0 || session.user.role === 'PARENT'
    );

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
      screenTime: screenTimeBalance ? {
        currentBalance: screenTimeBalance.currentBalanceMinutes,
        weeklyAllocation: screenTimeBalance.member.screenTimeSettings?.weeklyAllocationMinutes || 0,
        weekStartDate: screenTimeBalance.weekStartDate,
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
        items: shoppingLists[0].items.slice(0, 5),
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
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
