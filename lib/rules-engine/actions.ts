/**
 * Rules Engine Action Executors
 *
 * Functions to execute actions when rules are triggered.
 * Integrates with existing household management systems.
 */

import prisma from '@/lib/prisma';
import {
  RuleContext,
  ActionResult,
  AwardCreditsConfig,
  SendNotificationConfig,
  AddShoppingItemConfig,
  CreateTodoConfig,
  LockMedicationConfig,
  SuggestMealConfig,
  ReduceChoresConfig,
  AdjustScreenTimeConfig,
  DEFAULT_SAFETY_LIMITS,
} from './types';

// ============================================
// AWARD CREDITS ACTION
// ============================================

/**
 * Award credits to a family member
 * Follows pattern from /app/api/chores/[id]/approve/route.ts
 */
export async function executeAwardCredits(
  config: AwardCreditsConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    const targetMemberId = config.memberId || context.memberId;

    if (!targetMemberId) {
      return {
        success: false,
        error: 'No member ID specified for credit award',
      };
    }

    // Validate amount
    if (!config.amount || typeof config.amount !== 'number') {
      return {
        success: false,
        error: 'Award credits action requires amount (number)',
      };
    }

    if (config.amount < 1 || config.amount > DEFAULT_SAFETY_LIMITS.maxCreditsPerAction) {
      return {
        success: false,
        error: `Credit amount must be between 1 and ${DEFAULT_SAFETY_LIMITS.maxCreditsPerAction}`,
      };
    }

    // Execute in transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Upsert credit balance
      const creditBalance = await tx.creditBalance.upsert({
        where: { memberId: targetMemberId },
        update: {
          currentBalance: { increment: config.amount },
          lifetimeEarned: { increment: config.amount },
        },
        create: {
          memberId: targetMemberId,
          currentBalance: config.amount,
          lifetimeEarned: config.amount,
          lifetimeSpent: 0,
        },
      });

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          memberId: targetMemberId,
          type: 'BONUS',
          amount: config.amount,
          balanceAfter: creditBalance.currentBalance,
          reason: config.reason || 'Automation rule bonus',
          category: 'OTHER',
        },
      });

      return { newBalance: creditBalance.currentBalance };
    });

    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error('Error executing award credits action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// SEND NOTIFICATION ACTION
// ============================================

/**
 * Send notifications to family members
 */
export async function executeSendNotification(
  config: SendNotificationConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Validate recipients
    if (!Array.isArray(config.recipients) || config.recipients.length === 0) {
      return {
        success: false,
        error: 'Send notification action requires recipients array',
      };
    }

    if (config.recipients.length > DEFAULT_SAFETY_LIMITS.maxNotificationsPerExecution) {
      return {
        success: false,
        error: `Maximum ${DEFAULT_SAFETY_LIMITS.maxNotificationsPerExecution} notification recipients allowed`,
      };
    }

    // Validate title
    if (!config.title || typeof config.title !== 'string' || config.title.trim().length === 0) {
      return {
        success: false,
        error: 'Send notification action requires title (non-empty string)',
      };
    }

    // Validate message
    if (!config.message || typeof config.message !== 'string' || config.message.trim().length === 0) {
      return {
        success: false,
        error: 'Send notification action requires message (non-empty string)',
      };
    }

    let recipientIds: string[] = [];

    // Resolve recipient IDs
    for (const recipient of config.recipients) {
      if (recipient === 'all') {
        // Get all family members
        const members = await prisma.familyMember.findMany({
          where: { familyId: context.familyId, isActive: true },
          select: { id: true },
        });
        recipientIds = members.map(m => m.id);
        break;
      } else if (recipient === 'parents') {
        // Get all parents
        const parents = await prisma.familyMember.findMany({
          where: { familyId: context.familyId, role: 'PARENT', isActive: true },
          select: { id: true },
        });
        recipientIds.push(...parents.map(p => p.id));
      } else if (recipient === 'child' && context.memberId) {
        // Use context member
        recipientIds.push(context.memberId);
      } else {
        // Assume it's a member ID
        recipientIds.push(recipient);
      }
    }

    // Remove duplicates
    recipientIds = [...new Set(recipientIds)];

    // Create notifications
    await prisma.notification.createMany({
      data: recipientIds.map(userId => ({
        userId,
        type: 'GENERAL',
        title: config.title,
        message: config.message,
        actionUrl: config.actionUrl || null,
        metadata: {
          triggeredBy: 'automation_rule',
          ruleId: context.ruleId,
        } as any,
      })),
    });

    return {
      success: true,
      result: { notificationsSent: recipientIds.length },
    };
  } catch (error) {
    console.error('Error executing send notification action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// ADD SHOPPING ITEM ACTION
// ============================================

/**
 * Add item to shopping list
 * Follows pattern from /app/api/shopping/items/route.ts
 */
export async function executeAddShoppingItem(
  config: AddShoppingItemConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    let itemName = config.itemName;

    // If fromInventory is true, get item name from inventory
    if (config.fromInventory && context.inventoryItemId) {
      const inventoryItem = await prisma.inventoryItem.findUnique({
        where: { id: context.inventoryItemId },
        select: { name: true },
      });

      if (inventoryItem) {
        itemName = inventoryItem.name;
      }
    }

    if (!itemName) {
      return {
        success: false,
        error: 'No item name specified for shopping item',
      };
    }

    // Find or create active shopping list
    let shoppingList = await prisma.shoppingList.findFirst({
      where: { familyId: context.familyId, isActive: true },
    });

    if (!shoppingList) {
      shoppingList = await prisma.shoppingList.create({
        data: {
          familyId: context.familyId,
          name: 'Family Shopping List',
          isActive: true,
        },
      });
    }

    // Create shopping item
    // Use a system user ID or the first parent as the requester/adder
    const systemUser = await prisma.familyMember.findFirst({
      where: { familyId: context.familyId, role: 'PARENT' },
      select: { id: true },
    });

    if (!systemUser) {
      return {
        success: false,
        error: 'No parent user found to create shopping item',
      };
    }

    const item = await prisma.shoppingItem.create({
      data: {
        listId: shoppingList.id,
        name: itemName,
        quantity: config.quantity || 1,
        category: config.category || null,
        priority: config.priority || 'NORMAL',
        status: 'PENDING',
        notes: 'Added by automation rule',
        requestedById: systemUser.id,
        addedById: systemUser.id,
      },
    });

    return {
      success: true,
      result: { itemId: item.id, itemName: item.name },
    };
  } catch (error) {
    console.error('Error executing add shopping item action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// CREATE TODO ACTION
// ============================================

/**
 * Create a todo item
 * Follows pattern from /app/api/todos/route.ts
 */
export async function executeCreateTodo(
  config: CreateTodoConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Validate title
    if (!config.title || typeof config.title !== 'string' || config.title.trim().length === 0) {
      return {
        success: false,
        error: 'Create todo action requires title (non-empty string)',
      };
    }

    // Validate priority if provided
    if (config.priority && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(config.priority)) {
      return {
        success: false,
        error: 'Todo priority must be LOW, MEDIUM, HIGH, or URGENT',
      };
    }

    // Get a parent user to be the creator
    const creator = await prisma.familyMember.findFirst({
      where: { familyId: context.familyId, role: 'PARENT' },
      select: { id: true },
    });

    if (!creator) {
      return {
        success: false,
        error: 'No parent user found to create todo',
      };
    }

    const todo = await prisma.todoItem.create({
      data: {
        familyId: context.familyId,
        title: config.title,
        description: config.description || null,
        createdById: creator.id,
        assignedToId: config.assignedToId || context.memberId || null,
        dueDate: config.dueDate ? new Date(config.dueDate) : null,
        priority: config.priority || 'MEDIUM',
        category: config.category || 'Automation',
        status: 'PENDING',
      },
    });

    return {
      success: true,
      result: { todoId: todo.id, title: todo.title },
    };
  } catch (error) {
    console.error('Error executing create todo action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// LOCK MEDICATION ACTION
// ============================================

/**
 * Lock medication by setting next available dose time
 */
export async function executeLockMedication(
  config: LockMedicationConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Validate medication ID
    if (!config.medicationId) {
      return {
        success: false,
        error: 'Lock medication action requires medicationId',
      };
    }

    // Validate hours
    if (!config.hours || typeof config.hours !== 'number') {
      return {
        success: false,
        error: 'Lock medication action requires hours (number)',
      };
    }

    if (config.hours < 0) {
      return {
        success: false,
        error: 'Lock medication hours must be positive',
      };
    }

    if (config.hours > 24) {
      return {
        success: false,
        error: 'Lock medication hours cannot exceed 24 hours',
      };
    }

    const nextDoseTime = new Date();
    nextDoseTime.setHours(nextDoseTime.getHours() + config.hours);

    // Update medication safety record
    const medication = await prisma.medicationSafety.update({
      where: { id: config.medicationId },
      data: {
        lastDoseAt: new Date(),
        nextDoseAvailableAt: nextDoseTime,
      },
    });

    return {
      success: true,
      result: {
        medicationId: medication.id,
        lockedUntil: nextDoseTime.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error executing lock medication action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// SUGGEST MEAL ACTION
// ============================================

/**
 * Suggest meals by sending notification with recipe recommendations
 */
export async function executeSuggestMeal(
  config: SuggestMealConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Find matching recipes
    const where: any = {
      familyId: context.familyId,
    };

    if (config.difficulty) {
      where.difficulty = config.difficulty;
    }

    if (config.category) {
      where.category = config.category;
    }

    const recipes = await prisma.recipe.findMany({
      where,
      take: 3,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        difficulty: true,
        prepTimeMinutes: true,
        cookTimeMinutes: true,
      },
    });

    if (recipes.length === 0) {
      return {
        success: false,
        error: 'No recipes found matching criteria',
      };
    }

    // Send notification to parents with meal suggestions
    const parents = await prisma.familyMember.findMany({
      where: { familyId: context.familyId, role: 'PARENT', isActive: true },
      select: { id: true },
    });

    const recipeList = recipes.map(r => `${r.name} (${r.difficulty})`).join(', ');

    await prisma.notification.createMany({
      data: parents.map(p => ({
        userId: p.id,
        type: 'GENERAL',
        title: 'Meal Suggestions',
        message: `Easy meal ideas for today: ${recipeList}`,
        actionUrl: '/dashboard/meals/recipes',
        metadata: {
          triggeredBy: 'automation_rule',
          recipes: recipes.map(r => r.id),
        } as any,
      })),
    });

    return {
      success: true,
      result: { recipesSuggested: recipes.length },
    };
  } catch (error) {
    console.error('Error executing suggest meal action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// REDUCE CHORES ACTION
// ============================================

/**
 * Temporarily reduce chore assignments for a member
 */
export async function executeReduceChores(
  config: ReduceChoresConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Validate member ID
    const targetMemberId = config.memberId || context.memberId;
    if (!targetMemberId) {
      return {
        success: false,
        error: 'Reduce chores action requires memberId',
      };
    }

    // Validate percentage
    if (config.percentage < 0 || config.percentage > 100) {
      return {
        success: false,
        error: 'Reduce chores percentage must be between 0 and 100',
      };
    }

    // Validate duration
    if (config.duration < 1 || config.duration > 30) {
      return {
        success: false,
        error: 'Reduce chores duration must be between 1 and 30 days',
      };
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + config.duration);

    // Find pending chore instances for the member
    const pendingChores = await prisma.choreInstance.findMany({
      where: {
        assignedToId: targetMemberId,
        status: 'PENDING',
        dueDate: {
          lte: endDate,
        },
      },
      take: Math.ceil(10 * (config.percentage / 100)), // Reduce up to 10 chores
    });

    // Mark them as skipped
    await prisma.choreInstance.updateMany({
      where: {
        id: { in: pendingChores.map(c => c.id) },
      },
      data: {
        status: 'SKIPPED',
        notes: `Temporarily skipped by automation rule (${config.percentage}% reduction for ${config.duration} days)`,
      },
    });

    return {
      success: true,
      result: { choresReduced: pendingChores.length },
    };
  } catch (error) {
    console.error('Error executing reduce chores action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// ADJUST SCREEN TIME ACTION
// ============================================

/**
 * Adjust screen time balance for a member
 * Follows pattern from /app/api/screentime/adjust/route.ts
 */
export async function executeAdjustScreenTime(
  config: AdjustScreenTimeConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    // Validate member ID
    const targetMemberId = config.memberId || context.memberId;
    if (!targetMemberId) {
      return {
        success: false,
        error: 'Adjust screen time action requires memberId',
      };
    }

    // Validate amount
    if (config.amountMinutes === undefined || typeof config.amountMinutes !== 'number') {
      return {
        success: false,
        error: 'Adjust screen time action requires amountMinutes (number)',
      };
    }

    if (Math.abs(config.amountMinutes) > 120) {
      return {
        success: false,
        error: 'Screen time adjustment cannot exceed 120 minutes',
      };
    }

    // Get current balance
    const balance = await prisma.screenTimeBalance.findUnique({
      where: { memberId: targetMemberId },
    });

    if (!balance) {
      return {
        success: false,
        error: 'Screen time not configured for this member',
      };
    }

    const newBalance = Math.max(0, balance.currentBalanceMinutes + config.amountMinutes);

    // Update balance
    const updatedBalance = await prisma.screenTimeBalance.update({
      where: { memberId: targetMemberId },
      data: { currentBalanceMinutes: newBalance },
    });

    // Get a parent to be the adjuster
    const parent = await prisma.familyMember.findFirst({
      where: { familyId: context.familyId, role: 'PARENT' },
      select: { id: true },
    });

    // Log transaction
    await prisma.screenTimeTransaction.create({
      data: {
        memberId: targetMemberId,
        type: 'ADJUSTMENT',
        amountMinutes: config.amountMinutes,
        balanceAfter: newBalance,
        reason: config.reason || 'Automation rule adjustment',
        createdById: parent?.id || config.memberId,
      },
    });

    return {
      success: true,
      result: { newBalance, adjustment: config.amountMinutes },
    };
  } catch (error) {
    console.error('Error executing adjust screen time action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// MAIN ACTION EXECUTOR
// ============================================

/**
 * Execute any action type based on config and context
 */
export async function executeAction(
  actionType: string,
  actionConfig: any,
  context: RuleContext
): Promise<ActionResult> {
  try {
    switch (actionType) {
      case 'award_credits':
        return await executeAwardCredits(actionConfig, context);

      case 'send_notification':
        return await executeSendNotification(actionConfig, context);

      case 'add_shopping_item':
        return await executeAddShoppingItem(actionConfig, context);

      case 'create_todo':
        return await executeCreateTodo(actionConfig, context);

      case 'lock_medication':
        return await executeLockMedication(actionConfig, context);

      case 'suggest_meal':
        return await executeSuggestMeal(actionConfig, context);

      case 'reduce_chores':
        return await executeReduceChores(actionConfig, context);

      case 'adjust_screentime':
        return await executeAdjustScreenTime(actionConfig, context);

      default:
        return {
          success: false,
          error: `Unknown action type: ${actionType}`,
        };
    }
  } catch (error) {
    console.error(`Error executing action ${actionType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
