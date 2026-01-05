import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.familyId || session.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week'; // week, month, custom
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (period === 'custom' && startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Default to week
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { familyId } = session.user;

    // Get all active family members (children only)
    const members = await prisma.familyMember.findMany({
      where: {
        familyId,
        isActive: true,
        role: { not: 'PARENT' },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Parallel fetch all data
    const [
      choreInstances,
      creditTransactions,
      screenTimeTransactions,
      todoItems,
    ] = await Promise.all([
      // Chore instances
      prisma.choreInstance.findMany({
        where: {
          assignedToId: { in: members.map(m => m.id) },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          assignedToId: true,
          status: true,
          completedAt: true,
          createdAt: true,
        },
      }),

      // Credit transactions
      prisma.creditTransaction.findMany({
        where: {
          memberId: { in: members.map(m => m.id) },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          memberId: true,
          type: true,
          amount: true,
          createdAt: true,
        },
      }),

      // Screen time transactions
      prisma.screenTimeTransaction.findMany({
        where: {
          memberId: { in: members.map(m => m.id) },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          memberId: true,
          type: true,
          amountMinutes: true,
          deviceType: true,
          createdAt: true,
        },
      }),

      // Todo items
      prisma.todoItem.findMany({
        where: {
          OR: [
            { createdById: { in: members.map(m => m.id) } },
            { assignedToId: { in: members.map(m => m.id) } },
          ],
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          assignedToId: true,
          createdById: true,
          status: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Calculate overall metrics
    const totalChoresCompleted = choreInstances.filter(c => c.status === 'APPROVED').length;
    const totalChoresAssigned = choreInstances.length;
    const choreCompletionRate = totalChoresAssigned > 0
      ? ((totalChoresCompleted / totalChoresAssigned) * 100).toFixed(1)
      : 0;

    const totalCreditsEarned = creditTransactions
      .filter(t => t.type === 'CHORE_REWARD' || t.type === 'BONUS')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCreditsSpent = creditTransactions
      .filter(t => t.type === 'SCREENTIME_PURCHASE' || t.type === 'REWARD_REDEMPTION')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalScreenTimeUsed = screenTimeTransactions
      .filter(t => t.type === 'SPENT')
      .reduce((sum, t) => sum + Math.abs(t.amountMinutes), 0);

    const totalTodosCreated = todoItems.length;
    const totalTodosCompleted = todoItems.filter(t => t.status === 'COMPLETED').length;
    const todoCompletionRate = totalTodosCreated > 0
      ? ((totalTodosCompleted / totalTodosCreated) * 100).toFixed(1)
      : 0;

    // Per-child breakdown
    const childrenData = members.map(member => {
      const memberChores = choreInstances.filter(c => c.assignedToId === member.id);
      const memberCredits = creditTransactions.filter(t => t.memberId === member.id);
      const memberScreenTime = screenTimeTransactions.filter(t => t.memberId === member.id);
      const memberTodos = todoItems.filter(t =>
        t.assignedToId === member.id || t.createdById === member.id
      );

      const choresCompleted = memberChores.filter(c => c.status === 'APPROVED').length;
      const choresAssigned = memberChores.length;
      const creditsEarned = memberCredits
        .filter(t => t.type === 'CHORE_REWARD' || t.type === 'BONUS')
        .reduce((sum, t) => sum + t.amount, 0);
      const creditsSpent = memberCredits
        .filter(t => t.type === 'SCREENTIME_PURCHASE' || t.type === 'REWARD_REDEMPTION')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const screenTimeUsed = memberScreenTime
        .filter(t => t.type === 'SPENT')
        .reduce((sum, t) => sum + Math.abs(t.amountMinutes), 0);
      const todosCompleted = memberTodos.filter(t => t.status === 'COMPLETED').length;

      return {
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        chores: {
          completed: choresCompleted,
          assigned: choresAssigned,
          completionRate: choresAssigned > 0 ? ((choresCompleted / choresAssigned) * 100).toFixed(1) : 0,
        },
        credits: {
          earned: creditsEarned,
          spent: creditsSpent,
          net: creditsEarned - creditsSpent,
        },
        screenTime: {
          used: screenTimeUsed,
          hours: Math.floor(screenTimeUsed / 60),
          minutes: screenTimeUsed % 60,
        },
        todos: {
          completed: todosCompleted,
          total: memberTodos.length,
        },
      };
    });

    // Daily trend data for charts
    const dailyData: Record<string, any> = {};

    // Group chores by day
    choreInstances.forEach(chore => {
      const day = chore.createdAt.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, chores: 0, credits: 0, screenTime: 0, todos: 0 };
      }
      if (chore.status === 'APPROVED') {
        dailyData[day].chores += 1;
      }
    });

    // Group credits by day
    creditTransactions.forEach(tx => {
      const day = tx.createdAt.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, chores: 0, credits: 0, screenTime: 0, todos: 0 };
      }
      if (tx.type === 'CHORE_REWARD' || tx.type === 'BONUS') {
        dailyData[day].credits += tx.amount;
      }
    });

    // Group screen time by day
    screenTimeTransactions.forEach(tx => {
      const day = tx.createdAt.toISOString().split('T')[0];
      if (!dailyData[day]) {
        dailyData[day] = { date: day, chores: 0, credits: 0, screenTime: 0, todos: 0 };
      }
      if (tx.type === 'SPENT') {
        dailyData[day].screenTime += Math.abs(tx.amountMinutes);
      }
    });

    // Group todos by day
    todoItems.forEach(todo => {
      if (todo.completedAt) {
        const day = todo.completedAt.toISOString().split('T')[0];
        if (!dailyData[day]) {
          dailyData[day] = { date: day, chores: 0, credits: 0, screenTime: 0, todos: 0 };
        }
        dailyData[day].todos += 1;
      }
    });

    const dailyTrends = Object.values(dailyData).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        chores: {
          completed: totalChoresCompleted,
          assigned: totalChoresAssigned,
          completionRate: parseFloat(choreCompletionRate as string),
        },
        credits: {
          earned: totalCreditsEarned,
          spent: totalCreditsSpent,
          net: totalCreditsEarned - totalCreditsSpent,
        },
        screenTime: {
          totalMinutes: totalScreenTimeUsed,
          hours: Math.floor(totalScreenTimeUsed / 60),
          minutes: totalScreenTimeUsed % 60,
        },
        todos: {
          created: totalTodosCreated,
          completed: totalTodosCompleted,
          completionRate: parseFloat(todoCompletionRate as string),
        },
      },
      children: childrenData,
      trends: dailyTrends,
    });
  } catch (error) {
    logger.error('Family reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate family report' },
      { status: 500 }
    );
  }
}
