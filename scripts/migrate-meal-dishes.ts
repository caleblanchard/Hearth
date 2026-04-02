/**
 * Data Migration: Convert existing MealPlanEntry records to use MealPlanDish
 * 
 * This script:
 * 1. Finds all MealPlanEntry records with customName or recipeId
 * 2. Creates a MealPlanDish for each one
 * 3. Links the recipe if recipeId exists
 * 4. Copies the name from recipe or uses customName
 */

import { createAdminClient } from '@/lib/supabase/admin';

async function migrateMealDishes() {
  console.log('Starting meal dish migration...');

  try {
    const adminClient = createAdminClient();
    // Find all meal entries that have customName or recipeId but no dishes
    const { data: entries, error: entriesError } = await adminClient
      .from('meal_plan_entries')
      .select('id, custom_name, recipe_id, dishes:meal_plan_dishes(id)')
      .or('custom_name.not.is.null,recipe_id.not.is.null');

    if (entriesError) {
      throw new Error(entriesError.message);
    }

    const entryRows = entries ?? [];
    console.log(`Found ${entryRows.length} meal entries to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const entry of entryRows) {
      // Skip if already has dishes
      if (entry.dishes && entry.dishes.length > 0) {
        console.log(`  Skipping entry ${entry.id} - already has dishes`);
        skippedCount++;
        continue;
      }

      // Determine dish name
      let dishName: string;
      
      // If has recipeId, fetch the recipe name
      if (entry.recipe_id) {
        const { data: recipe, error: recipeError } = await adminClient
          .from('recipes')
          .select('name')
          .eq('id', entry.recipe_id)
          .maybeSingle();
        if (recipeError) {
          throw new Error(recipeError.message);
        }
        
        if (recipe) {
          dishName = recipe.name;
        } else if (entry.custom_name) {
          // Recipe not found, fall back to customName
          dishName = entry.custom_name;
        } else {
          console.log(`  Skipping entry ${entry.id} - recipe not found and no customName`);
          skippedCount++;
          continue;
        }
      } else if (entry.custom_name) {
        dishName = entry.custom_name;
      } else {
        console.log(`  Skipping entry ${entry.id} - no name available`);
        skippedCount++;
        continue;
      }

      // Create dish
      const { error: dishError } = await adminClient
        .from('meal_plan_dishes')
        .insert({
          meal_entry_id: entry.id,
          recipe_id: entry.recipe_id,
          dish_name: dishName,
          sort_order: 0,
        });
      if (dishError) {
        throw new Error(dishError.message);
      }

      migratedCount++;
      console.log(`  ✓ Migrated entry ${entry.id}: "${dishName}"`);
    }

    console.log('\nMigration complete!');
    console.log(`  Migrated: ${migratedCount}`);
    console.log(`  Skipped: ${skippedCount}`);
    console.log(`  Total: ${entryRows.length}`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
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
