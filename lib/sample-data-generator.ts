/**
 * Sample Data Generator for Onboarding
 *
 * Generates example data to help new users explore Hearth features.
 * All sample data can be deleted by the user later.
 */

import { PrismaClient } from '@/app/generated/prisma';
import { ModuleId, Difficulty, TodoPriority } from '@/app/generated/prisma';

interface SampleDataOptions {
  familyId: string;
  adminId: string;
  enabledModules: ModuleId[];
}

/**
 * Generate sample data based on enabled modules
 */
export async function generateSampleData(
  prisma: PrismaClient | any, // Allow transaction client
  options: SampleDataOptions
): Promise<void> {
  const { familyId, adminId, enabledModules } = options;

  // Generate sample data for each enabled module
  if (enabledModules.includes(ModuleId.CHORES)) {
    await generateSampleChores(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.TODOS)) {
    await generateSampleTodos(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.SHOPPING)) {
    await generateSampleShoppingLists(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.CALENDAR)) {
    await generateSampleCalendarEvents(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.RECIPES)) {
    await generateSampleRecipes(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.MEAL_PLANNING)) {
    await generateSampleMealPlans(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.ROUTINES)) {
    await generateSampleRoutines(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.COMMUNICATION)) {
    await generateSampleCommunicationPosts(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.INVENTORY)) {
    await generateSampleInventoryItems(prisma, familyId, adminId);
  }

  if (enabledModules.includes(ModuleId.MAINTENANCE)) {
    await generateSampleMaintenanceItems(prisma, familyId, adminId);
  }
}

async function generateSampleChores(prisma: any, familyId: string, adminId: string) {
  const choreDefinitions = [
    {
      familyId,
      name: 'Wash Dishes',
      description: 'Clean and dry all dishes, pots, and pans',
      difficulty: Difficulty.EASY,
      creditValue: 5,
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      familyId,
      name: 'Vacuum Living Room',
      description: 'Vacuum all carpets and rugs in the living room',
      difficulty: Difficulty.MEDIUM,
      creditValue: 8,
      estimatedMinutes: 20,
      isActive: true,
    },
    {
      familyId,
      name: 'Take Out Trash',
      description: 'Empty all trash cans and take bags to outdoor bins',
      difficulty: Difficulty.EASY,
      creditValue: 3,
      estimatedMinutes: 10,
      isActive: true,
    },
    {
      familyId,
      name: 'Water Plants',
      description: 'Water all indoor and outdoor plants',
      difficulty: Difficulty.EASY,
      creditValue: 4,
      estimatedMinutes: 15,
      isActive: true,
    },
    {
      familyId,
      name: 'Make Bed',
      description: 'Make your bed with clean sheets',
      difficulty: Difficulty.EASY,
      creditValue: 2,
      estimatedMinutes: 5,
      isActive: true,
    },
  ];

  for (const chore of choreDefinitions) {
    await prisma.choreDefinition.create({ data: chore });
  }
}

async function generateSampleTodos(prisma: any, familyId: string, adminId: string) {
  const todos = [
    {
      familyId,
      title: 'Schedule dentist appointment',
      description: 'Call Dr. Smith\'s office for routine cleaning',
      priority: TodoPriority.MEDIUM,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isCompleted: false,
      createdById: adminId,
    },
    {
      familyId,
      title: 'Buy birthday gift for grandma',
      description: 'Her birthday is next month',
      priority: TodoPriority.LOW,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isCompleted: false,
      createdById: adminId,
    },
    {
      familyId,
      title: 'Pay electricity bill',
      description: 'Due by the 15th of this month',
      priority: TodoPriority.HIGH,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      isCompleted: false,
      createdById: adminId,
    },
  ];

  for (const todo of todos) {
    await prisma.todoItem.create({ data: todo });
  }
}

async function generateSampleShoppingLists(prisma: any, familyId: string, adminId: string) {
  const shoppingList = await prisma.shoppingList.create({
    data: {
      familyId,
      name: 'Weekly Groceries',
      description: 'Regular grocery shopping list',
      createdById: adminId,
    },
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

  for (const item of items) {
    await prisma.shoppingListItem.create({
      data: {
        ...item,
        shoppingListId: shoppingList.id,
        addedById: adminId,
      },
    });
  }
}

async function generateSampleCalendarEvents(prisma: any, familyId: string, adminId: string) {
  const events = [
    {
      familyId,
      title: 'Family Game Night',
      description: 'Board games and snacks',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
      isAllDay: false,
      createdById: adminId,
    },
    {
      familyId,
      title: 'Dentist Appointment',
      description: 'Routine cleaning for everyone',
      startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour duration
      isAllDay: false,
      createdById: adminId,
    },
    {
      familyId,
      title: 'Grandma\'s Birthday',
      description: 'Don\'t forget to call!',
      startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isAllDay: true,
      createdById: adminId,
    },
  ];

  for (const event of events) {
    await prisma.calendarEvent.create({ data: event });
  }
}

async function generateSampleRecipes(prisma: any, familyId: string, adminId: string) {
  const recipes = [
    {
      familyId,
      name: 'Spaghetti with Marinara Sauce',
      description: 'Classic Italian pasta dish with homemade marinara',
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      servings: 4,
      difficulty: Difficulty.EASY,
      ingredients: JSON.stringify([
        { quantity: 1, unit: 'lb', name: 'spaghetti' },
        { quantity: 2, unit: 'cups', name: 'marinara sauce' },
        { quantity: 2, unit: 'tbsp', name: 'olive oil' },
        { quantity: 3, unit: 'cloves', name: 'garlic, minced' },
        { quantity: 0.25, unit: 'cup', name: 'parmesan cheese, grated' },
      ]),
      instructions: JSON.stringify([
        'Bring a large pot of salted water to a boil',
        'Add spaghetti and cook according to package directions',
        'While pasta cooks, heat olive oil in a pan over medium heat',
        'Add minced garlic and cook for 1 minute until fragrant',
        'Add marinara sauce and simmer for 10 minutes',
        'Drain pasta and toss with sauce',
        'Serve topped with parmesan cheese',
      ]),
      category: 'Main Course',
      cuisine: 'Italian',
      dietaryTags: JSON.stringify(['vegetarian']),
      createdById: adminId,
    },
    {
      familyId,
      name: 'Chicken Stir-Fry',
      description: 'Quick and healthy Asian-inspired chicken and vegetable stir-fry',
      prepTimeMinutes: 20,
      cookTimeMinutes: 15,
      servings: 4,
      difficulty: Difficulty.MEDIUM,
      ingredients: JSON.stringify([
        { quantity: 1, unit: 'lb', name: 'chicken breast, cubed' },
        { quantity: 2, unit: 'cups', name: 'mixed vegetables' },
        { quantity: 3, unit: 'tbsp', name: 'soy sauce' },
        { quantity: 1, unit: 'tbsp', name: 'sesame oil' },
        { quantity: 2, unit: 'cloves', name: 'garlic, minced' },
        { quantity: 1, unit: 'tbsp', name: 'ginger, grated' },
        { quantity: 2, unit: 'cups', name: 'cooked rice' },
      ]),
      instructions: JSON.stringify([
        'Heat sesame oil in a large wok or skillet over high heat',
        'Add chicken and stir-fry for 5-7 minutes until cooked through',
        'Remove chicken and set aside',
        'Add garlic and ginger to the wok, cook for 30 seconds',
        'Add vegetables and stir-fry for 3-4 minutes',
        'Return chicken to wok, add soy sauce, and toss to combine',
        'Serve over rice',
      ]),
      category: 'Main Course',
      cuisine: 'Asian',
      dietaryTags: JSON.stringify(['gluten-free']),
      createdById: adminId,
    },
  ];

  for (const recipe of recipes) {
    await prisma.recipe.create({ data: recipe });
  }
}

async function generateSampleMealPlans(prisma: any, familyId: string, adminId: string) {
  // Get the recipes we just created
  const recipes = await prisma.recipe.findMany({
    where: { familyId },
    take: 2,
  });

  if (recipes.length === 0) return;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const mealPlan = await prisma.mealPlan.create({
    data: {
      familyId,
      name: 'This Week',
      startDate,
      endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdById: adminId,
    },
  });

  // Add some meal plan items
  const mealPlanItems = [
    {
      mealPlanId: mealPlan.id,
      date: new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      mealType: 'DINNER',
      recipeId: recipes[0]?.id,
    },
    {
      mealPlanId: mealPlan.id,
      date: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      mealType: 'DINNER',
      recipeId: recipes[1]?.id,
    },
  ];

  for (const item of mealPlanItems) {
    if (item.recipeId) {
      await prisma.mealPlanItem.create({ data: item });
    }
  }
}

async function generateSampleRoutines(prisma: any, familyId: string, adminId: string) {
  const routine = await prisma.routine.create({
    data: {
      familyId,
      name: 'Morning Routine',
      description: 'Things to do every morning',
      isActive: true,
      createdById: adminId,
    },
  });

  const steps = [
    { name: 'Make bed', estimatedMinutes: 5, order: 1 },
    { name: 'Brush teeth', estimatedMinutes: 3, order: 2 },
    { name: 'Get dressed', estimatedMinutes: 10, order: 3 },
    { name: 'Eat breakfast', estimatedMinutes: 15, order: 4 },
    { name: 'Pack backpack', estimatedMinutes: 5, order: 5 },
  ];

  for (const step of steps) {
    await prisma.routineStep.create({
      data: {
        ...step,
        routineId: routine.id,
      },
    });
  }
}

async function generateSampleCommunicationPosts(prisma: any, familyId: string, adminId: string) {
  const posts = [
    {
      familyId,
      authorId: adminId,
      content: 'Welcome to Hearth! This is your family communication board. Use it to share updates, photos, and stay connected.',
      postType: 'ANNOUNCEMENT',
    },
    {
      familyId,
      authorId: adminId,
      content: 'Don\'t forget we have dentist appointments next week. I\'ll send calendar invites.',
      postType: 'MESSAGE',
    },
  ];

  for (const post of posts) {
    await prisma.communicationPost.create({ data: post });
  }
}

async function generateSampleInventoryItems(prisma: any, familyId: string, adminId: string) {
  const items = [
    {
      familyId,
      name: 'AA Batteries',
      category: 'Electronics',
      currentQuantity: 8,
      minQuantity: 4,
      maxQuantity: 20,
      unit: 'count',
      location: 'Utility drawer',
      createdById: adminId,
    },
    {
      familyId,
      name: 'Dish Soap',
      category: 'Cleaning',
      currentQuantity: 2,
      minQuantity: 1,
      maxQuantity: 5,
      unit: 'bottles',
      location: 'Under sink',
      createdById: adminId,
    },
    {
      familyId,
      name: 'Paper Towels',
      category: 'Cleaning',
      currentQuantity: 3,
      minQuantity: 2,
      maxQuantity: 12,
      unit: 'rolls',
      location: 'Pantry',
      createdById: adminId,
    },
  ];

  for (const item of items) {
    await prisma.inventoryItem.create({ data: item });
  }
}

async function generateSampleMaintenanceItems(prisma: any, familyId: string, adminId: string) {
  const items = [
    {
      familyId,
      name: 'Change HVAC Filter',
      description: 'Replace air filter in HVAC system',
      category: 'HVAC',
      frequency: 'Monthly',
      nextDueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      estimatedCost: 25,
    },
    {
      familyId,
      name: 'Clean Gutters',
      description: 'Remove leaves and debris from rain gutters',
      category: 'EXTERIOR',
      frequency: 'Yearly',
      nextDueAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      estimatedCost: 150,
    },
  ];

  for (const item of items) {
    await prisma.maintenanceItem.create({ data: item });
  }
}
