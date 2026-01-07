import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Helper function to get start of week
function getWeekStart(date: Date, weekStartDay: 'SUNDAY' | 'MONDAY'): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  
  if (weekStartDay === 'SUNDAY') {
    const diff = d.getUTCDate() - day;
    d.setUTCDate(diff);
  } else {
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
  }
  
  return d;
}

export async function POST() {
  try {
    // Authenticate - only admins should run this
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];
    
    // Get all meal plans with their family settings
    const mealPlans = await prisma.mealPlan.findMany({
      include: {
        family: {
          select: {
            id: true,
            name: true,
            settings: true,
          },
        },
        meals: {
          select: {
            date: true,
          },
          orderBy: {
            date: 'asc',
          },
          take: 1,
        },
      },
    });

    let fixedCount = 0;
    let unchangedCount = 0;
    let skippedCount = 0;

    for (const mealPlan of mealPlans) {
      const familySettings = mealPlan.family.settings as any;
      const weekStartDay = familySettings?.weekStartDay || 'MONDAY';

      // Skip if no meals
      if (mealPlan.meals.length === 0) {
        results.push({
          id: mealPlan.id,
          family: mealPlan.family.name,
          status: 'skipped',
          reason: 'Empty plan',
        });
        skippedCount++;
        continue;
      }

      // Recalculate correct weekStart based on family's week start setting
      const currentWeekStart = new Date(mealPlan.weekStart);
      currentWeekStart.setUTCHours(0, 0, 0, 0);
      
      // Use family's setting to recalculate
      const correctWeekStart = getWeekStart(currentWeekStart, weekStartDay);

      if (correctWeekStart.getTime() === currentWeekStart.getTime()) {
        results.push({
          id: mealPlan.id,
          family: mealPlan.family.name,
          status: 'unchanged',
          weekStart: correctWeekStart.toISOString().split('T')[0],
        });
        unchangedCount++;
      } else {
        // Update the weekStart
        await prisma.mealPlan.update({
          where: { id: mealPlan.id },
          data: { weekStart: correctWeekStart },
        });

        results.push({
          id: mealPlan.id,
          family: mealPlan.family.name,
          status: 'fixed',
          oldWeekStart: currentWeekStart.toISOString().split('T')[0],
          newWeekStart: correctWeekStart.toISOString().split('T')[0],
        });
        fixedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: mealPlans.length,
        fixed: fixedCount,
        unchanged: unchangedCount,
        skipped: skippedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error fixing meal plan week starts:', error);
    return NextResponse.json(
      { error: 'Failed to fix meal plan week starts' },
      { status: 500 }
    );
  }
}
