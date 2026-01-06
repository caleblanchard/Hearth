/**
 * Rules Engine Pre-built Templates
 *
 * Collection of ready-to-use automation rule templates.
 * Users can instantiate these with customizations.
 */

import { Prisma } from '@/app/generated/prisma';
import { RuleTemplate } from './types';

// ============================================
// PRE-BUILT RULE TEMPLATES
// ============================================

export const RULE_TEMPLATES: RuleTemplate[] = [
  // 1. Chore Streak Bonus
  {
    id: 'chore_streak_bonus',
    name: 'Chore Streak Bonus',
    description: 'Award 10 credits for 7-day chore streak',
    category: 'rewards',
    trigger: {
      type: 'chore_streak',
      config: { days: 7 },
    },
    actions: [
      {
        type: 'award_credits',
        config: {
          amount: 10,
          reason: 'Chore streak bonus! 7 days in a row!',
        },
      },
    ],
    customizable: ['trigger.config.days', 'actions.0.config.amount'],
  },

  // 2. Low Screen Time Warning
  {
    id: 'screentime_warning',
    name: 'Low Screen Time Warning',
    description: 'Notify when screen time balance drops below 30 minutes',
    category: 'convenience',
    trigger: {
      type: 'screentime_low',
      config: { thresholdMinutes: 30 },
    },
    actions: [
      {
        type: 'send_notification',
        config: {
          recipients: ['child'],
          title: 'Screen Time Running Low',
          message: 'You have less than 30 minutes of screen time remaining.',
          actionUrl: '/dashboard/screentime',
        },
      },
    ],
    customizable: ['trigger.config.thresholdMinutes'],
  },

  // 3. Medication Safety Timer
  {
    id: 'medication_cooldown',
    name: 'Medication Safety Timer',
    description: 'Lock medication for 6 hours after dose given',
    category: 'safety',
    trigger: {
      type: 'medication_given',
      config: { anyMedication: true },
    },
    actions: [
      {
        type: 'lock_medication',
        config: { hours: 6, medicationId: 'TO_BE_CONFIGURED' },
      },
    ],
    customizable: ['actions.0.config.hours', 'actions.0.config.medicationId'],
  },

  // 4. Busy Day Meal Helper
  {
    id: 'busy_day_meals',
    name: 'Busy Day Meal Helper',
    description: 'Suggest easy meals when calendar shows 3+ events',
    category: 'convenience',
    trigger: {
      type: 'calendar_busy',
      config: { eventCount: 3 },
    },
    actions: [
      {
        type: 'suggest_meal',
        config: { difficulty: 'EASY' },
      },
    ],
    customizable: ['trigger.config.eventCount'],
  },

  // 5. Weekly Allowance
  {
    id: 'weekly_allowance',
    name: 'Weekly Allowance',
    description: 'Award credits every Sunday at 9 AM',
    category: 'rewards',
    trigger: {
      type: 'time_based',
      config: {
        cron: '0 9 * * 0',
        description: 'Every Sunday at 9 AM',
      },
    },
    actions: [
      {
        type: 'award_credits',
        config: {
          amount: 20,
          reason: 'Weekly allowance',
        },
      },
    ],
    customizable: ['actions.0.config.amount', 'trigger.config.cron'],
  },

  // 6. Birthday Bonus
  {
    id: 'birthday_bonus',
    name: 'Birthday Bonus',
    description: 'Award 50 credits on member birthday',
    category: 'rewards',
    trigger: {
      type: 'time_based',
      config: {
        cron: 'birthday',
        description: 'On member birthday',
      },
    },
    actions: [
      {
        type: 'award_credits',
        config: {
          amount: 50,
          reason: 'Happy Birthday! 🎉',
        },
      },
    ],
    customizable: ['actions.0.config.amount'],
  },

  // 7. Perfect Week Bonus
  {
    id: 'perfect_week',
    name: 'Perfect Week Bonus',
    description: 'Award 25 credits for completing all chores in a week',
    category: 'rewards',
    trigger: {
      type: 'chore_completed',
      config: { anyChore: true },
    },
    conditions: {
      operator: 'AND',
      rules: [
        {
          field: 'completionRate',
          operator: 'equals',
          value: 100,
        },
      ],
    },
    actions: [
      {
        type: 'award_credits',
        config: {
          amount: 25,
          reason: 'Perfect week! All chores completed!',
        },
      },
    ],
    customizable: ['actions.0.config.amount'],
  },

  // 8. Low Inventory Auto-Add
  {
    id: 'low_inventory_alert',
    name: 'Low Inventory Auto-Add',
    description: 'Auto-add items to shopping list when inventory is low',
    category: 'convenience',
    trigger: {
      type: 'inventory_low',
      config: {
        category: 'FOOD_PANTRY',
        thresholdPercentage: 20,
      },
    },
    actions: [
      {
        type: 'add_shopping_item',
        config: {
          fromInventory: true,
          priority: 'NEEDED_SOON',
          itemName: '', // Will be filled from inventory
        },
      },
    ],
    customizable: ['trigger.config.category', 'trigger.config.thresholdPercentage'],
  },
];

// ============================================
// TEMPLATE UTILITIES
// ============================================

/**
 * Get template by ID
 */
export function getTemplateById(templateId: string): RuleTemplate | null {
  return RULE_TEMPLATES.find(t => t.id === templateId) || null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): RuleTemplate[] {
  return RULE_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: 'productivity' | 'safety' | 'rewards' | 'convenience'
): RuleTemplate[] {
  return RULE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Instantiate a template into a rule creation payload
 */
export function instantiateTemplate(
  templateId: string,
  familyId: string,
  createdById: string,
  customizations?: Record<string, any>
): any {
  const template = getTemplateById(templateId);

  if (!template) {
    return null;
  }

  // Deep clone the template
  const trigger = JSON.parse(JSON.stringify(template.trigger));
  const conditions = template.conditions ? JSON.parse(JSON.stringify(template.conditions)) : null;
  const actions = JSON.parse(JSON.stringify(template.actions));

  // Apply customizations using dot notation paths
  if (customizations) {
    for (const [path, value] of Object.entries(customizations)) {
      const parts = path.split('.');

      // Apply to trigger
      if (parts[0] === 'trigger') {
        applyValue(trigger, parts.slice(1), value);
      }

      // Apply to conditions
      if (parts[0] === 'conditions' && conditions) {
        applyValue(conditions, parts.slice(1), value);
      }

      // Apply to actions
      if (parts[0] === 'actions') {
        const actionIndex = parseInt(parts[1], 10);
        if (!isNaN(actionIndex) && actions[actionIndex]) {
          applyValue(actions[actionIndex], parts.slice(2), value);
        }
      }
    }
  }

  return {
    familyId,
    name: template.name,
    description: template.description,
    trigger,
    conditions,
    actions,
    isEnabled: true,
    createdById,
  };
}

/**
 * Helper function to apply value to nested object using path
 */
function applyValue(obj: any, path: string[], value: any): void {
  if (path.length === 0) return;

  if (path.length === 1) {
    obj[path[0]] = value;
  } else {
    const [current, ...rest] = path;
    if (!obj[current]) {
      obj[current] = {};
    }
    applyValue(obj[current], rest, value);
  }
}

/**
 * Validate customizations against template's customizable fields
 */
export function validateCustomizations(
  templateId: string,
  customizations: Record<string, any>
): { valid: boolean; errors: string[] } {
  const template = getTemplateById(templateId);

  if (!template) {
    return { valid: false, errors: ['Template not found'] };
  }

  const errors: string[] = [];

  // Check that all customization paths are allowed
  for (const path of Object.keys(customizations)) {
    if (!template.customizable.includes(path)) {
      errors.push(`Field "${path}" is not customizable for this template`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get template with applied customizations (preview)
 */
export function previewTemplate(
  templateId: string,
  customizations?: Record<string, any>
): RuleTemplate | null {
  const template = getTemplateById(templateId);

  if (!template) {
    return null;
  }

  // Deep clone
  const preview: RuleTemplate = JSON.parse(JSON.stringify(template));

  // Apply customizations
  if (customizations) {
    for (const [path, value] of Object.entries(customizations)) {
      const parts = path.split('.');

      if (parts[0] === 'trigger') {
        applyValue(preview.trigger, parts.slice(1), value);
      }

      if (parts[0] === 'conditions' && preview.conditions) {
        applyValue(preview.conditions, parts.slice(1), value);
      }

      if (parts[0] === 'actions') {
        const actionIndex = parseInt(parts[1], 10);
        if (!isNaN(actionIndex) && preview.actions[actionIndex]) {
          applyValue(preview.actions[actionIndex], parts.slice(2), value);
        }
      }
    }
  }

  return preview;
}
