/**
 * Fix MealPlan weekStart values that were calculated with timezone bugs
 */

const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

// Helper function to get start of week
function getWeekStart(date, weekStartDay) {
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

async function fixMealPlanWeekStarts() {
  try {
    console.log('Starting MealPlan weekStart fix...\n');

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

    console.log(`Found ${mealPlans.length} meal plans to check\n`);

    let fixedCount = 0;
    let unchangedCount = 0;

    for (const mealPlan of mealPlans) {
      const familySettings = mealPlan.family.settings || {};
      const weekStartDay = familySettings.weekStartDay || 'MONDAY';

      if (mealPlan.meals.length === 0) {
        console.log(`⏭️  MealPlan ${mealPlan.id} (${mealPlan.family.name}): Empty plan, skipping`);
        unchangedCount++;
        continue;
      }

      const firstMealDate = new Date(mealPlan.meals[0].date);
      const correctWeekStart = getWeekStart(firstMealDate, weekStartDay);

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
  } finally {
    await prisma.$disconnect();
  }
}

fixMealPlanWeekStarts();
