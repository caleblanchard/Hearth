/**
 * Rules Engine Action Executors
 *
 * Functions to execute actions when rules are triggered.
 * Integrates with existing household management systems.
 * 
 * MIGRATED TO SUPABASE - January 10, 2026
 */

import { createClient } from '@/lib/supabase/server';
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

    // Execute credit award using Supabase
    const supabase = await createClient();

    // Get or create credit balance
    const { data: existingBalance } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('member_id', targetMemberId)
      .maybeSingle();

    let newBalance: number;
    
    if (existingBalance) {
      // Update existing balance
      newBalance = existingBalance.current_balance + config.amount;
      const { error } = await supabase
        .from('credit_balances')
        .update({
          current_balance: newBalance,
          lifetime_earned: existingBalance.lifetime_earned + config.amount,
        })
        .eq('member_id', targetMemberId);
      
      if (error) throw error;
    } else {
      // Create new balance
      newBalance = config.amount;
      const { error } = await supabase
        .from('credit_balances')
        .insert({
          member_id: targetMemberId,
          current_balance: config.amount,
          lifetime_earned: config.amount,
          lifetime_spent: 0,
        });
      
      if (error) throw error;
    }

    // Create transaction record
    await supabase
      .from('credit_transactions')
      .insert({
        member_id: targetMemberId,
        type: 'BONUS',
        amount: config.amount,
        balance_after: newBalance,
        reason: config.reason || 'Automation rule bonus',
        category: 'OTHER',
      });

    return {
      success: true,
      result: { newBalance },
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
 * Send notification to family member(s)
 */
export async function executeSendNotification(
  config: SendNotificationConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    if (!config.recipients || config.recipients.length === 0) {
      return {
        success: false,
        error: 'Send notification action requires at least one recipient',
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

    const supabase = await createClient();
    let recipientIds: string[] = [];

    // Resolve recipient IDs
    for (const recipient of config.recipients) {
      if (recipient === 'all') {
        // Get all family members
        const { data: members } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_id', context.familyId)
          .eq('is_active', true);

        recipientIds = members?.map((m: any) => m.id) || [];
        break;
      } else if (recipient === 'parents') {
        // Get all parents
        const { data: parents } = await supabase
          .from('family_members')
          .select('id')
          .eq('family_id', context.familyId)
          .eq('role', 'PARENT')
          .eq('is_active', true);

        recipientIds.push(...(parents?.map((p: any) => p.id) || []));
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
    const notifications = recipientIds.map(user_id => ({
      user_id,
      type: 'GENERAL' as any,
      title: config.title,
      message: config.message,
      action_url: config.actionUrl || null,
      metadata: {
        triggeredBy: 'automation_rule',
        ruleId: context.ruleId,
        familyId: context.familyId,
      },
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

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
 */
export async function executeAddShoppingItem(
  config: AddShoppingItemConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    let itemName = config.itemName;

    const supabase = await createClient();

    // If fromInventory is true, get item name from inventory
    if (config.fromInventory && context.inventoryItemId) {
      const { data: inventoryItem } = await supabase
        .from('inventory_items')
        .select('name')
        .eq('id', context.inventoryItemId)
        .single();

      if (inventoryItem) {
        itemName = inventoryItem.name;
      }
    }

    // Validate item name
    if (!itemName || typeof itemName !== 'string' || itemName.trim().length === 0) {
      return {
        success: false,
        error: 'Shopping item requires a name',
      };
    }

    // Find or create active shopping list
    let { data: shoppingList } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('family_id', context.familyId)
      .eq('is_active', true)
      .maybeSingle();

    if (!shoppingList) {
      const { data: newList, error } = await supabase
        .from('shopping_lists')
        .insert({
          family_id: context.familyId,
          name: 'Shopping List',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      shoppingList = newList;
    }

    // Get a parent user to be the requester/adder
    const { data: systemUser } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', context.familyId)
      .eq('role', 'PARENT')
      .limit(1)
      .maybeSingle();

    if (!systemUser) {
      return {
        success: false,
        error: 'No parent found to add item',
      };
    }

    // Create shopping item
    const { data: item, error } = await supabase
      .from('shopping_items')
      .insert({
        list_id: shoppingList.id,
        name: itemName,
        quantity: config.quantity || 1,
        category: config.category || 'OTHER',
        priority: (config.priority || 'NORMAL') as any,
        requested_by_id: systemUser.id,
        added_by_id: systemUser.id,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;

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
 * Create a TODO item
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
        error: 'Create TODO action requires title (non-empty string)',
      };
    }

    const supabase = await createClient();

    // Get a parent user to be the creator
    const { data: creator } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', context.familyId)
      .eq('role', 'PARENT')
      .limit(1)
      .maybeSingle();

    if (!creator) {
      return {
        success: false,
        error: 'No parent found to create TODO',
      };
    }

    const { data: todo, error } = await supabase
      .from('todo_items')
      .insert({
        family_id: context.familyId,
        title: config.title,
        description: config.description || null,
        assigned_to_id: config.assignedToId || null,
        priority: config.priority || 'MEDIUM',
        due_date: config.dueDate || null,
        created_by_id: creator.id,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      result: { todoId: todo.id, title: todo.title },
    };
  } catch (error) {
    console.error('Error executing create TODO action:', error);
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
 * Lock medication temporarily (prevent dispensing)
 */
export async function executeLockMedication(
  config: LockMedicationConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    const medicationId = config.medicationId || context.medicationId;

    if (!medicationId) {
      return {
        success: false,
        error: 'No medication ID specified',
      };
    }

    const supabase = await createClient();

    // Update medication safety record - set next dose available time to lock it
    const lockUntil = config.hours
      ? new Date(Date.now() + config.hours * 3600000).toISOString()
      : new Date(Date.now() + 86400000).toISOString(); // Default 24 hours

    const { data: medication, error } = await supabase
      .from('medication_safety')
      .update({
        next_dose_available_at: lockUntil,
      })
      .eq('id', medicationId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      result: { medicationId: medication.id, locked: true },
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
 * Suggest meal based on dietary preferences
 */
export async function executeSuggestMeal(
  config: SuggestMealConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Build recipe filter
    let query = supabase
      .from('recipes')
      .select('*')
      .eq('family_id', context.familyId);

    if (config.category) {
      query = query.eq('category', config.category as any);
    }

    if (config.difficulty) {
      query = query.eq('difficulty', config.difficulty as any);
    }

    query = query.limit(3);

    const { data: recipes } = await query;

    if (!recipes || recipes.length === 0) {
      return {
        success: false,
        error: 'No recipes found matching criteria',
      };
    }

    // Send notification to parents with meal suggestions
    const { data: parents } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', context.familyId)
      .eq('role', 'PARENT')
      .eq('is_active', true);

    const recipeList = recipes.map((r: any) => `${r.name} (${r.difficulty})`).join(', ');

    const notifications = (parents || []).map((p: any) => ({
      user_id: p.id,
      type: 'GENERAL' as any,
      title: 'Meal Suggestion',
      message: `Suggested meals: ${recipeList}`,
      metadata: {
        triggeredBy: 'automation_rule',
        ruleId: context.ruleId,
        familyId: context.familyId,
      },
    }));

    await supabase
      .from('notifications')
      .insert(notifications);

    return {
      success: true,
      result: { recipeSuggestions: recipes.length, recipeList },
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
 * Reduce chore load (skip pending chores)
 */
export async function executeReduceChores(
  config: ReduceChoresConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    const targetMemberId = config.memberId || context.memberId;

    if (!targetMemberId) {
      return {
        success: false,
        error: 'No member ID specified',
      };
    }

    // Validate percentage (0-100)
    if (config.percentage < 1 || config.percentage > 100) {
      return {
        success: false,
        error: 'Chore reduction percentage must be between 1 and 100',
      };
    }

    // Validate duration (1-30 days)
    if (config.duration < 1 || config.duration > 30) {
      return {
        success: false,
        error: 'Chore reduction duration must be between 1 and 30 days',
      };
    }

    const supabase = await createClient();

    // Calculate number of chores to skip based on percentage
    // For simplicity, we'll skip pending chores proportional to the percentage
    const { data: allPendingChores } = await supabase
      .from('chore_instances')
      .select('id')
      .eq('assigned_to_id', targetMemberId)
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true });

    if (!allPendingChores || allPendingChores.length === 0) {
      return {
        success: false,
        error: 'No pending chores found for member',
      };
    }

    // Calculate how many to skip based on percentage
    const countToSkip = Math.max(1, Math.ceil((allPendingChores.length * config.percentage) / 100));

    // Find pending chore instances to skip
    const { data: pendingChores } = await supabase
      .from('chore_instances')
      .select('id')
      .eq('assigned_to_id', targetMemberId)
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true })
      .limit(countToSkip);

    if (!pendingChores || pendingChores.length === 0) {
      return {
        success: false,
        error: 'No pending chores found for member',
      };
    }

    // Mark them as skipped
    const { error } = await supabase
      .from('chore_instances')
      .update({ status: 'SKIPPED' })
      .in('id', pendingChores.map((c: any) => c.id));

    if (error) throw error;

    return {
      success: true,
      result: { choresSkipped: pendingChores.length },
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
// ADJUST SCREENTIME ACTION
// ============================================

/**
 * Adjust screentime balance
 */
export async function executeAdjustScreenTime(
  config: AdjustScreenTimeConfig,
  context: RuleContext
): Promise<ActionResult> {
  try {
    const targetMemberId = config.memberId || context.memberId;

    if (!targetMemberId) {
      return {
        success: false,
        error: 'No member ID specified',
      };
    }

    // Validate adjustment
    if (typeof config.amountMinutes !== 'number') {
      return {
        success: false,
        error: 'Screentime adjustment requires amountMinutes (number)',
      };
    }

    if (Math.abs(config.amountMinutes) > 480) { // Max 8 hours
      return {
        success: false,
        error: 'Screentime adjustment must be within +/- 480 minutes (8 hours)',
      };
    }

    const supabase = await createClient();

    // Get current balance
    const { data: balance } = await supabase
      .from('screen_time_balances')
      .select('*')
      .eq('member_id', targetMemberId)
      .maybeSingle();

    if (!balance) {
      return {
        success: false,
        error: 'No screentime balance found for member',
      };
    }

    const newBalance = Math.max(0, (balance.current_balance_minutes || 0) + config.amountMinutes);

    // Update balance
    const { data: updatedBalance, error } = await supabase
      .from('screen_time_balances')
      .update({ current_balance_minutes: newBalance })
      .eq('member_id', targetMemberId)
      .select()
      .single();

    if (error) throw error;

    // Get a parent to be the adjuster
    const { data: parent } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', context.familyId)
      .eq('role', 'PARENT')
      .limit(1)
      .maybeSingle();

    // Log transaction
    await supabase
      .from('screen_time_transactions')
      .insert({
        member_id: targetMemberId,
        type: config.amountMinutes > 0 ? 'EARNED' : 'SPENT',
        amount_minutes: Math.abs(config.amountMinutes),
        balance_after: newBalance,
        reason: config.reason || 'Automation rule adjustment',
        created_by_id: parent?.id || context.memberId || targetMemberId,
      });

    return {
      success: true,
      result: { newBalance, adjustment: config.amountMinutes },
    };
  } catch (error) {
    console.error('Error executing adjust screentime action:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// ACTION ROUTER
// ============================================

/**
 * Execute an action based on action type
 */
export async function executeAction(
  actionType: string,
  config: any,
  context: RuleContext
): Promise<ActionResult> {
  switch (actionType) {
    case 'AWARD_CREDITS':
      return executeAwardCredits(config, context)
    case 'SEND_NOTIFICATION':
      return executeSendNotification(config, context)
    case 'ADD_SHOPPING_ITEM':
      return executeAddShoppingItem(config, context)
    case 'CREATE_TODO':
      return executeCreateTodo(config, context)
    case 'LOCK_MEDICATION':
      return executeLockMedication(config, context)
    case 'SUGGEST_MEAL':
      return executeSuggestMeal(config, context)
    case 'REDUCE_CHORES':
      return executeReduceChores(config, context)
    case 'ADJUST_SCREENTIME':
      return executeAdjustScreenTime(config, context)
    default:
      return {
        success: false,
        error: `Unknown action type: ${actionType}`,
      }
  }
}
