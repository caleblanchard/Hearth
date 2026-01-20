/**
 * Sample Data Generator for Onboarding
 *
 * Generates example data to help new users explore Hearth features.
 * All sample data can be deleted by the user later.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { ModuleId, Difficulty, TodoPriority } from '@/lib/enums';

interface SampleDataOptions {
  familyId: string;
  adminId: string;
  enabledModules: ModuleId[];
}

type SupabaseDatabaseClient = SupabaseClient<Database>;

async function insertSingle<T>(
  supabase: SupabaseDatabaseClient,
  table: keyof Database['public']['Tables'],
  data: Record<string, unknown>
): Promise<T> {
  const { data: row, error } = await supabase
    .from(table as any)
    .insert(data)
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return row as T;
}

async function insertMany(
  supabase: SupabaseDatabaseClient,
  table: keyof Database['public']['Tables'],
  data: Record<string, unknown>[]
) {
  if (data.length === 0) return;
  const { error } = await supabase.from(table as any).insert(data);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Generate sample data based on enabled modules
 */
export async function generateSampleData(
  supabase: SupabaseDatabaseClient,
  options: SampleDataOptions
): Promise<void> {
  const { familyId, adminId, enabledModules } = options;

  // Generate sample data for each enabled module
  if (enabledModules.includes(ModuleId.CHORES)) {
    await generateSampleChores(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.TODOS)) {
    await generateSampleTodos(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.SHOPPING)) {
    await generateSampleShoppingLists(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.CALENDAR)) {
    await generateSampleCalendarEvents(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.RECIPES)) {
    await generateSampleRecipes(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.MEAL_PLANNING)) {
    await generateSampleMealPlans(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.ROUTINES)) {
    await generateSampleRoutines(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.COMMUNICATION)) {
    await generateSampleCommunicationPosts(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.INVENTORY)) {
    await generateSampleInventoryItems(supabase, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.MAINTENANCE)) {
    await generateSampleMaintenanceItems(supabase, familyId, adminId);
  }
}

async function generateSampleChores(supabase: SupabaseDatabaseClient, familyId: string, adminId: string) {
  const choreDefinitions = [
    {
      family_id: familyId,
      name: 'Wash Dishes',
      description: 'Clean and dry all dishes, pots, and pans',
      difficulty: Difficulty.EASY,
      credit_value: 5,
      estimated_minutes: 15,
      is_active: true,
    },
    {
      family_id: familyId,
      name: 'Vacuum Living Room',
      description: 'Vacuum all carpets and rugs in the living room',
      difficulty: Difficulty.MEDIUM,
      credit_value: 8,
      estimated_minutes: 20,
      is_active: true,
    },
    {
      family_id: familyId,
      name: 'Take Out Trash',
      description: 'Empty all trash cans and take bags to outdoor bins',
      difficulty: Difficulty.EASY,
      credit_value: 3,
      estimated_minutes: 10,
      is_active: true,
    },
    {
      family_id: familyId,
      name: 'Water Plants',
      description: 'Water all indoor and outdoor plants',
      difficulty: Difficulty.EASY,
      credit_value: 4,
      estimated_minutes: 15,
      is_active: true,
    },
    {
      family_id: familyId,
      name: 'Make Bed',
      description: 'Make your bed with clean sheets',
      difficulty: Difficulty.EASY,
      credit_value: 2,
      estimated_minutes: 5,
      is_active: true,
    },
  ];

  await insertMany(supabase, 'chore_definitions', choreDefinitions);
}

async function generateSampleTodos(supabase: SupabaseDatabaseClient, familyId: string, adminId: string) {
  const todos = [
    {
      family_id: familyId,
      title: 'Schedule dentist appointment',
      description: 'Call Dr. Smith\'s office for routine cleaning',
      priority: TodoPriority.MEDIUM,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'PENDING',
      created_by_id: adminId,
    },
    {
      family_id: familyId,
      title: 'Buy birthday gift for grandma',
      description: 'Her birthday is next month',
      priority: TodoPriority.LOW,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'PENDING',
      created_by_id: adminId,
    },
    {
      family_id: familyId,
      title: 'Pay electricity bill',
      description: 'Due by the 15th of this month',
      priority: TodoPriority.HIGH,
      due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      status: 'PENDING',
      created_by_id: adminId,
    },
  ];

  await insertMany(supabase, 'todo_items', todos);
}

async function generateSampleShoppingLists(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const shoppingList = await insertSingle<{ id: string }>(supabase, 'shopping_lists', {
    family_id: familyId,
    name: 'Weekly Groceries',
    is_active: true,
  });

  const items = [
    { name: 'Milk', quantity: 1, unit: 'gallon', category: 'Dairy', isPurchased: false },
    { name: 'Bread', quantity: 2, unit: 'loaves', category: 'Bakery', isPurchased: false },
    { name: 'Eggs', quantity: 1, unit: 'dozen', category: 'Dairy', isPurchased: false },
    { name: 'Apples', quantity: 6, unit: 'count', category: 'Produce', isPurchased: false },
    { name: 'Chicken breast', quantity: 2, unit: 'lbs', category: 'Meat', isPurchased: false },
    { name: 'Rice', quantity: 1, unit: 'bag', category: 'Pantry', isPurchased: true },
    { name: 'Bananas', quantity: 1, unit: 'bunch', category: 'Produce', isPurchased: false },
  ];

  const mappedItems = items.map((item) => ({
    list_id: shoppingList.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    added_by_id: adminId,
    requested_by_id: adminId,
    status: item.isPurchased ? 'PURCHASED' : 'PENDING',
    priority: 'NORMAL',
  }));

  await insertMany(supabase, 'shopping_items', mappedItems);
}

async function generateSampleCalendarEvents(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const events = [
    {
      family_id: familyId,
      title: 'Family Game Night',
      description: 'Board games and snacks',
      start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours duration
      is_all_day: false,
      created_by_id: adminId,
      event_type: 'INTERNAL',
    },
    {
      family_id: familyId,
      title: 'Dentist Appointment',
      description: 'Routine cleaning for everyone',
      start_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days from now
      end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // 1 hour duration
      is_all_day: false,
      created_by_id: adminId,
      event_type: 'INTERNAL',
    },
    {
      family_id: familyId,
      title: 'Grandma\'s Birthday',
      description: 'Don\'t forget to call!',
      start_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      end_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      is_all_day: true,
      created_by_id: adminId,
      event_type: 'INTERNAL',
    },
  ];

  await insertMany(supabase, 'calendar_events', events);
}

async function generateSampleRecipes(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const recipes = [
    {
      family_id: familyId,
      name: 'Spaghetti with Marinara Sauce',
      description: 'Classic Italian pasta dish with homemade marinara',
      prep_time_minutes: 15,
      cook_time_minutes: 30,
      servings: 4,
      difficulty: Difficulty.EASY,
      category: 'DINNER',
      dietary_tags: ['VEGETARIAN'],
      instructions: [
        'Bring a large pot of salted water to a boil',
        'Add spaghetti and cook according to package directions',
        'While pasta cooks, heat olive oil in a pan over medium heat',
        'Add minced garlic and cook for 1 minute until fragrant',
        'Add marinara sauce and simmer for 10 minutes',
        'Drain pasta and toss with sauce',
        'Serve topped with parmesan cheese',
      ],
      ingredients: [
        { quantity: 1, unit: 'lb', name: 'spaghetti' },
        { quantity: 2, unit: 'cups', name: 'marinara sauce' },
        { quantity: 2, unit: 'tbsp', name: 'olive oil' },
        { quantity: 3, unit: 'cloves', name: 'garlic, minced' },
        { quantity: 0.25, unit: 'cup', name: 'parmesan cheese, grated' },
      ],
    },
    {
      family_id: familyId,
      name: 'Chicken Stir-Fry',
      description: 'Quick and healthy Asian-inspired chicken and vegetable stir-fry',
      prep_time_minutes: 20,
      cook_time_minutes: 15,
      servings: 4,
      difficulty: Difficulty.MEDIUM,
      category: 'DINNER',
      dietary_tags: ['GLUTEN_FREE'],
      instructions: [
        'Heat sesame oil in a large wok or skillet over high heat',
        'Add chicken and stir-fry for 5-7 minutes until cooked through',
        'Remove chicken and set aside',
        'Add garlic and ginger to the wok, cook for 30 seconds',
        'Add vegetables and stir-fry for 3-4 minutes',
        'Return chicken to wok, add soy sauce, and toss to combine',
        'Serve over rice',
      ],
      ingredients: [
        { quantity: 1, unit: 'lb', name: 'chicken breast, cubed' },
        { quantity: 2, unit: 'cups', name: 'mixed vegetables' },
        { quantity: 3, unit: 'tbsp', name: 'soy sauce' },
        { quantity: 1, unit: 'tbsp', name: 'sesame oil' },
        { quantity: 2, unit: 'cloves', name: 'garlic, minced' },
        { quantity: 1, unit: 'tbsp', name: 'ginger, grated' },
        { quantity: 2, unit: 'cups', name: 'cooked rice' },
      ],
    },
  ];

  for (const recipe of recipes) {
    const created = await insertSingle<{ id: string }>(supabase, 'recipes', {
      family_id: recipe.family_id,
      name: recipe.name,
      description: recipe.description,
      prep_time_minutes: recipe.prep_time_minutes,
      cook_time_minutes: recipe.cook_time_minutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      category: recipe.category,
      dietary_tags: recipe.dietary_tags,
      instructions: JSON.stringify(recipe.instructions),
      created_by: adminId,
      is_favorite: false,
    });

    const ingredientRows = recipe.ingredients.map((ingredient, index) => ({
      recipe_id: created.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      sort_order: index,
    }));

    await insertMany(supabase, 'recipe_ingredients', ingredientRows);
  }
}

async function generateSampleMealPlans(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id')
    .eq('family_id', familyId)
    .limit(2);

  if (recipesError) {
    throw new Error(recipesError.message);
  }

  const recipeRows = recipes ?? [];
  if (recipeRows.length === 0) return;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const mealPlan = await insertSingle<{ id: string }>(supabase, 'meal_plans', {
    family_id: familyId,
    week_start: startDate.toISOString(),
  });

  // Add some meal plan items
  const mealPlanEntries = [
    {
      meal_plan_id: mealPlan.id,
      date: new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      meal_type: 'DINNER',
      recipe_id: recipeRows[0]?.id,
    },
    {
      meal_plan_id: mealPlan.id,
      date: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      meal_type: 'DINNER',
      recipe_id: recipeRows[1]?.id,
    },
  ];

  const entriesToInsert = mealPlanEntries.filter((entry) => entry.recipe_id);
  await insertMany(supabase, 'meal_plan_entries', entriesToInsert);
}

async function generateSampleRoutines(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const routine = await insertSingle<{ id: string }>(supabase, 'routines', {
    family_id: familyId,
    name: 'Morning Routine',
    type: 'MORNING',
    assigned_to: adminId,
    is_weekday: true,
    is_weekend: true,
  });

  const steps = [
    { name: 'Make bed', estimatedMinutes: 5, order: 1 },
    { name: 'Brush teeth', estimatedMinutes: 3, order: 2 },
    { name: 'Get dressed', estimatedMinutes: 10, order: 3 },
    { name: 'Eat breakfast', estimatedMinutes: 15, order: 4 },
    { name: 'Pack backpack', estimatedMinutes: 5, order: 5 },
  ];

  const stepRows = steps.map((step) => ({
    name: step.name,
    estimated_minutes: step.estimatedMinutes,
    sort_order: step.order,
    routine_id: routine.id,
  }));

  await insertMany(supabase, 'routine_steps', stepRows);
}

async function generateSampleCommunicationPosts(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const posts = [
    {
      family_id: familyId,
      author_id: adminId,
      content:
        'Welcome to Hearth! This is your family communication board. Use it to share updates, photos, and stay connected.',
      type: 'ANNOUNCEMENT',
      is_pinned: true,
    },
    {
      family_id: familyId,
      author_id: adminId,
      content:
        'Don\'t forget we have dentist appointments next week. I\'ll send calendar invites.',
      type: 'NOTE',
      is_pinned: false,
    },
  ];

  await insertMany(supabase, 'communication_posts', posts);
}

async function generateSampleInventoryItems(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const items = [
    {
      family_id: familyId,
      name: 'AA Batteries',
      category: 'OTHER',
      current_quantity: 8,
      low_stock_threshold: 4,
      unit: 'count',
      location: 'OTHER',
    },
    {
      family_id: familyId,
      name: 'Dish Soap',
      category: 'CLEANING',
      current_quantity: 2,
      low_stock_threshold: 1,
      unit: 'bottles',
      location: 'KITCHEN_CABINET',
    },
    {
      family_id: familyId,
      name: 'Paper Towels',
      category: 'PAPER_GOODS',
      current_quantity: 3,
      low_stock_threshold: 2,
      unit: 'rolls',
      location: 'PANTRY',
    },
  ];

  await insertMany(supabase, 'inventory_items', items);
}

async function generateSampleMaintenanceItems(
  supabase: SupabaseDatabaseClient,
  familyId: string,
  adminId: string
) {
  const items = [
    {
      family_id: familyId,
      name: 'Change HVAC Filter',
      description: 'Replace air filter in HVAC system',
      category: 'HVAC',
      frequency: 'Monthly',
      next_due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
      estimated_cost: 25,
    },
    {
      family_id: familyId,
      name: 'Clean Gutters',
      description: 'Remove leaves and debris from rain gutters',
      category: 'EXTERIOR',
      frequency: 'Yearly',
      next_due_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
      estimated_cost: 150,
    },
  ];

  await insertMany(supabase, 'maintenance_items', items);
}
