/**
 * Data Migration: Convert existing MealPlanEntry records to use MealPlanDish
 * 
 * This script:
 * 1. Finds all MealPlanEntry records with customName or recipeId
 * 2. Creates a MealPlanDish for each one
 * 3. Links the recipe if recipeId exists
 * 4. Copies the name from recipe or uses customName
 */

import prisma from '@/lib/prisma';

async function migrateMealDishes() {
  console.log('Starting meal dish migration...');

  try {
    // Find all meal entries that have customName or recipeId but no dishes
    const entries = await prisma.mealPlanEntry.findMany({
      where: {
        OR: [
          { customName: { not: null } },
          { recipeId: { not: null } },
        ],
      },
      include: {
        dishes: true,
      },
    });

    console.log(`Found ${entries.length} meal entries to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      // Skip if already has dishes
      if (entry.dishes.length > 0) {
        console.log(`  Skipping entry ${entry.id} - already has dishes`);
        skippedCount++;
        continue;
      }

      // Determine dish name
      let dishName: string;
      
      // If has recipeId, fetch the recipe name
      if (entry.recipeId) {
        const recipe = await prisma.recipe.findUnique({
          where: { id: entry.recipeId },
          select: { name: true },
        });
        
        if (recipe) {
          dishName = recipe.name;
        } else if (entry.customName) {
          // Recipe not found, fall back to customName
          dishName = entry.customName;
        } else {
          console.log(`  Skipping entry ${entry.id} - recipe not found and no customName`);
          skippedCount++;
          continue;
        }
      } else if (entry.customName) {
        dishName = entry.customName;
      } else {
        console.log(`  Skipping entry ${entry.id} - no name available`);
        skippedCount++;
        continue;
      }

      // Create dish
      await prisma.mealPlanDish.create({
        data: {
          mealEntryId: entry.id,
          recipeId: entry.recipeId,
          dishName,
          sortOrder: 0,
        },
      });

      migratedCount++;
      console.log(`  ✓ Migrated entry ${entry.id}: "${dishName}"`);
    }

    console.log('\nMigration complete!');
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Total: ${entries.length}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateMealDishes()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
