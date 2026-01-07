#!/usr/bin/env ts-node

/**
 * Fix MealPlan weekStart values that were calculated with timezone bugs
 * 
 * This script recalculates all weekStart values for existing MealPlan records
 * to ensure they match the correct Monday (or Sunday) of each week.
 */

import prisma from '../lib/prisma';

// Helper function to get start of week
function getWeekStart(date: Date, weekStartDay: 'SUNDAY' | 'MONDAY'): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  
  if (weekStartDay === 'SUNDAY') {
    // Get Sunday of the week
    const diff = d.getUTCDate() - day;
    d.setUTCDate(diff);
  } else {
    // Get Monday of the week
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
  }
  
  return d;
}

async function fixMealPlanWeekStarts() {
  try {
    console.log('Starting MealPlan weekStart fix...\n');

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
          take: 1, // Just get first meal to determine what week this should be
        },
      },
    });

    console.log(`Found ${mealPlans.length} meal plans to check\n`);

    let fixedCount = 0;
    let unchangedCount = 0;

    for (const mealPlan of mealPlans) {
      const familySettings = mealPlan.family.settings as any;
      const weekStartDay = familySettings?.weekStartDay || 'MONDAY';

      // Skip if no meals (empty plan)
      if (mealPlan.meals.length === 0) {
        console.log(`⏭️  MealPlan ${mealPlan.id} (${mealPlan.family.name}): Empty plan, skipping`);
        unchangedCount++;
        continue;
      }

      // Calculate correct weekStart from first meal date
      const firstMealDate = new Date(mealPlan.meals[0].date);
      const correctWeekStart = getWeekStart(firstMealDate, weekStartDay);

      // Compare with current weekStart
      const currentWeekStart = new Date(mealPlan.weekStart);
      currentWeekStart.setUTCHours(0, 0, 0, 0);

      if (correctWeekStart.getTime() === currentWeekStart.getTime()) {
        console.log(
          `✅ MealPlan ${mealPlan.id} (${mealPlan.family.name}): ` +
          `Already correct (${correctWeekStart.toISOString().split('T')[0]})`
        );
        unchangedCount++;
      } else {
        console.log(
          `🔧 MealPlan ${mealPlan.id} (${mealPlan.family.name}): ` +
          `Fixing ${currentWeekStart.toISOString().split('T')[0]} → ` +
          `${correctWeekStart.toISOString().split('T')[0]}`
        );

        // Update the weekStart
        await prisma.mealPlan.update({
          where: { id: mealPlan.id },
          data: { weekStart: correctWeekStart },
        });

        fixedCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log(`  Fixed: ${fixedCount}`);
    console.log(`  Already correct: ${unchangedCount}`);
    console.log(`  Total: ${mealPlans.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error fixing meal plan week starts:', error);
    process.exit(1);
  }
}

// Run the script
fixMealPlanWeekStarts();
