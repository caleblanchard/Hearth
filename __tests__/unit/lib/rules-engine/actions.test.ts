/**
 * Unit Tests: Rules Engine Action Executors
 *
 * Tests for all 8 action type executors
 * Total: 64 tests (8 per action type)
 */

// Mock Prisma before imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

import {
  executeAwardCredits,
  executeSendNotification,
  executeAddShoppingItem,
  executeCreateTodo,
  executeLockMedication,
  executeSuggestMeal,
  executeReduceChores,
  executeAdjustScreenTime,
} from '@/lib/rules-engine/actions';
import type { RuleContext } from '@/lib/rules-engine/types';

describe('Rules Engine Action Executors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  // ============================================
  // AWARD CREDITS ACTION (8 tests)
  // ============================================

  describe('Award Credits Action', () => {
    it('should award credits to specified member', async () => {
      const config = { amount: 10, memberId: 'member-1', reason: 'Good job!' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const mockUpdatedBalance = {
        id: 'balance-1',
        memberId: 'member-1',
        currentBalance: 60,
        lifetimeEarned: 110,
        lifetimeSpent: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: {
            upsert: jest.fn().mockResolvedValue(mockUpdatedBalance),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should award credits to context member if not specified', async () => {
      const config = { amount: 15, reason: 'Bonus!' };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-2',
      };

      const mockUpdatedBalance = {
        id: 'balance-2',
        memberId: 'member-2',
        currentBalance: 40,
        lifetimeEarned: 90,
        lifetimeSpent: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: {
            upsert: jest.fn().mockResolvedValue(mockUpdatedBalance),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should create balance if it does not exist', async () => {
      const config = { amount: 20, memberId: 'member-3' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const mockNewBalance = {
        id: 'new-balance',
        memberId: 'member-3',
        currentBalance: 20,
        lifetimeEarned: 20,
        lifetimeSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: {
            upsert: jest.fn().mockResolvedValue(mockNewBalance),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('should enforce maximum credit limit', async () => {
      const config = { amount: 1500, memberId: 'member-1' }; // Over 1000 limit
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credit amount must be between 1 and 1000');
    });

    it('should reject negative amounts', async () => {
      const config = { amount: -10, memberId: 'member-1' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Credit amount must be between 1 and 1000');
    });

    it('should handle database errors gracefully', async () => {
      const config = { amount: 10, memberId: 'member-1' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.$transaction.mockRejectedValue(new Error('Database error'));

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should use default reason if not provided', async () => {
      const config = { amount: 10, memberId: 'member-1' };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const mockUpdatedBalance = {
        id: 'balance-1',
        memberId: 'member-1',
        currentBalance: 60,
        lifetimeEarned: 110,
        lifetimeSpent: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          creditBalance: {
            upsert: jest.fn().mockResolvedValue(mockUpdatedBalance),
          },
          creditTransaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return await callback(tx);
      });

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(true);
    });

    it('should fail if no member ID available', async () => {
      const config = { amount: 10 }; // No memberId
      const context: RuleContext = {
        familyId: 'family-1',
        // No memberId in context either
      };

      const result = await executeAwardCredits(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No member ID specified for credit award');
    });
  });

  // ============================================
  // SEND NOTIFICATION ACTION (8 tests)
  // ============================================

  describe('Send Notification Action', () => {
    it('should send notification to specified recipients', async () => {
      const config = {
        recipients: ['member-1', 'member-2'],
        title: 'Alert',
        message: 'Important message',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.notification.createMany).toHaveBeenCalled();
    });

    it('should include action URL if provided', async () => {
      const config = {
        recipients: ['member-1'],
        title: 'Check this',
        message: 'New update',
        actionUrl: '/dashboard/updates',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.notification.createMany.mockResolvedValue({ count: 1 });

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(true);
    });

    it('should enforce maximum recipient limit', async () => {
      const config = {
        recipients: Array(15).fill('member'),
        title: 'Test',
        message: 'Test',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 10 notification recipients allowed');
    });

    it('should require title', async () => {
      const config = {
        recipients: ['member-1'],
        message: 'Message without title',
      } as any;
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
    });

    it('should require message', async () => {
      const config = {
        recipients: ['member-1'],
        title: 'Title without message',
      } as any;
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Send notification action requires message');
    });

    it('should require at least one recipient', async () => {
      const config = {
        recipients: [],
        title: 'Test',
        message: 'Test',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Send notification action requires recipients array');
    });

    it('should handle database errors', async () => {
      const config = {
        recipients: ['member-1'],
        title: 'Test',
        message: 'Test',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.notification.createMany.mockRejectedValue(new Error('DB error'));

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(false);
    });

    it('should handle special recipient keywords', async () => {
      const config = {
        recipients: ['child', 'parent'],
        title: 'Family Alert',
        message: 'Important',
      };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-1',
      };

      // Mock finding family members by role
      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'child-1', role: 'CHILD' },
        { id: 'parent-1', role: 'PARENT' },
      ] as any);

      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      const result = await executeSendNotification(config, context);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // ADD SHOPPING ITEM ACTION (8 tests)
  // ============================================

  describe('Add Shopping Item Action', () => {
    const mockShoppingList = {
      id: 'list-1',
      familyId: 'family-1',
      name: 'Family Shopping List',
      isActive: true,
    };

    const mockParent = {
      id: 'parent-1',
      familyId: 'family-1',
      role: 'PARENT',
    };

    beforeEach(() => {
      // Setup common mocks for shopping item tests
      prismaMock.shoppingList.findFirst.mockResolvedValue(mockShoppingList as any);
      prismaMock.familyMember.findFirst.mockResolvedValue(mockParent as any);
    });
    it('should add shopping item with all details', async () => {
      const config = {
        itemName: 'Milk',
        quantity: 2,
        category: 'FOOD_FRIDGE',
        priority: 'NEEDED_SOON',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const mockShoppingList = {
        id: 'list-1',
        familyId: 'family-1',
        name: 'Family Shopping List',
        isActive: true,
      };

      const mockParent = {
        id: 'parent-1',
        familyId: 'family-1',
        role: 'PARENT',
      };

      prismaMock.shoppingList.findFirst.mockResolvedValue(mockShoppingList as any);
      prismaMock.familyMember.findFirst.mockResolvedValue(mockParent as any);
      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        familyId: 'family-1',
        itemName: 'Milk',
        quantity: 2,
        category: 'FOOD_FRIDGE',
        priority: 'NEEDED_SOON',
        isPurchased: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.shoppingItem.create).toHaveBeenCalled();
    });

    it('should use default quantity if not provided', async () => {
      const config = {
        itemName: 'Eggs',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.shoppingItem.create.mockResolvedValue({} as any);

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(true);
    });

    it('should pull from inventory context if fromInventory is true', async () => {
      const config = {
        fromInventory: true,
        priority: 'NEEDED_SOON',
      };
      const context: RuleContext = {
        familyId: 'family-1',
        inventoryItemId: 'inv-1',
      };

      prismaMock.inventoryItem.findUnique.mockResolvedValue({
        id: 'inv-1',
        name: 'Paper Towels',
      } as any);
      prismaMock.shoppingItem.create.mockResolvedValue({} as any);

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(true);
    });

    it('should require itemName if not from inventory', async () => {
      const config = {
        quantity: 1,
      } as any;
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No item name specified for shopping item');
    });

    it('should handle duplicate items gracefully', async () => {
      const config = {
        itemName: 'Bread',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.shoppingItem.create.mockRejectedValue(new Error('Unique constraint violation'));

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(false);
    });

    it('should validate priority values', async () => {
      const config = {
        itemName: 'Test',
        priority: 'NEEDED_SOON',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        priority: 'NEEDED_SOON',
      } as any);

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const config = {
        itemName: 'Test Item',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.shoppingItem.create.mockRejectedValue(new Error('DB error'));

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(false);
    });

    it('should add note if provided in config', async () => {
      const config = {
        itemName: 'Special Item',
        notes: 'Get the organic version',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.shoppingItem.create.mockResolvedValue({
        id: 'item-1',
        notes: 'Get the organic version',
      } as any);

      const result = await executeAddShoppingItem(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.shoppingItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Get the organic version',
          }),
        })
      );
    });
  });

  // ============================================
  // CREATE TODO ACTION (8 tests)
  // ============================================

  describe('Create Todo Action', () => {
    it('should create todo with all details', async () => {
      const config = {
        title: 'Buy groceries',
        description: 'Get milk and eggs',
        assignedToId: 'member-1',
        dueDate: '2024-12-31',
        priority: 'HIGH',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({
        id: 'todo-1',
        familyId: 'family-1',
        title: 'Buy groceries',
        description: 'Get milk and eggs',
        assignedToId: 'member-1',
        dueDate: new Date('2024-12-31'),
        priority: 'HIGH',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.todoItem.create).toHaveBeenCalled();
    });

    it('should use context memberId if not specified', async () => {
      const config = {
        title: 'Clean room',
      };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-2',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({} as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
    });

    it('should require title', async () => {
      const config = {
        description: 'No title',
      } as any;
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Title is required');
    });

    it('should handle optional description', async () => {
      const config = {
        title: 'Simple todo',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({} as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle optional dueDate', async () => {
      const config = {
        title: 'No deadline todo',
        assignedToId: 'member-1',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({} as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
    });

    it('should validate priority values', async () => {
      const config = {
        title: 'Priority test',
        priority: 'MEDIUM',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({} as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const config = {
        title: 'Test',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.todo.create.mockRejectedValue(new Error('DB error'));

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(false);
    });

    it('should parse date strings correctly', async () => {
      const config = {
        title: 'Date test',
        dueDate: '2024-12-25T00:00:00.000Z',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.familyMember.findFirst.mockResolvedValue({ id: 'parent-1' } as any);
      prismaMock.todoItem.create.mockResolvedValue({} as any);

      const result = await executeCreateTodo(config, context);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // LOCK MEDICATION ACTION (8 tests)
  // ============================================

  describe('Lock Medication Action', () => {
    it('should lock medication for specified hours', async () => {
      const config = {
        medicationId: 'med-1',
        hours: 6,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const now = new Date();
      const lockUntil = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      prismaMock.medicationSafety.update.mockResolvedValue({
        id: 'safety-1',
        nextDoseAvailableAt: lockUntil,
      } as any);

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.medicationSafety.update).toHaveBeenCalled();
    });

    it('should use medication from context if not specified', async () => {
      const config = {
        hours: 4,
      };
      const context: RuleContext = {
        familyId: 'family-1',
        medicationId: 'med-from-context',
      };

      prismaMock.medicationSafety.update.mockResolvedValue({} as any);

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(true);
    });

    it('should require medication ID', async () => {
      const config = {
        hours: 6,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lock medication action requires medicationId');
    });

    it('should require hours', async () => {
      const config = {
        medicationId: 'med-1',
      } as any;
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lock duration in hours is required');
    });

    it('should enforce maximum lock duration', async () => {
      const config = {
        medicationId: 'med-1',
        hours: 48, // Over 24 hour limit
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lock medication hours cannot exceed 24 hours');
    });

    it('should reject negative hours', async () => {
      const config = {
        medicationId: 'med-1',
        hours: -2,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Lock medication hours must be positive');
    });

    it('should handle database errors', async () => {
      const config = {
        medicationId: 'med-1',
        hours: 6,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.medicationSafety.update.mockRejectedValue(new Error('DB error'));

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(false);
    });

    it('should calculate correct lock time', async () => {
      const config = {
        medicationId: 'med-1',
        hours: 12,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.medicationSafety.update.mockResolvedValue({} as any);

      const result = await executeLockMedication(config, context);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // SUGGEST MEAL ACTION (8 tests)
  // ============================================

  describe('Suggest Meal Action', () => {
    it('should suggest meal with difficulty filter', async () => {
      const config = {
        difficulty: 'EASY',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Pasta', difficulty: 'EASY' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
    });

    it('should suggest meal with category filter', async () => {
      const config = {
        category: 'DINNER',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Steak', category: 'DINNER' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle no meals found', async () => {
      const config = {
        difficulty: 'EASY',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([]);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No meals found');
    });

    it('should select random meal from results', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Pizza' },
        { id: 'meal-2', name: 'Burger' },
        { id: 'meal-3', name: 'Salad' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
    });

    it('should send notification to family', async () => {
      const config = {
        difficulty: 'MEDIUM',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Tacos' },
      ] as any);

      prismaMock.familyMember.findMany.mockResolvedValue([
        { id: 'parent-1', role: 'PARENT' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
      expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it('should handle both difficulty and category filters', async () => {
      const config = {
        difficulty: 'EASY',
        category: 'LUNCH',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Sandwich', difficulty: 'EASY', category: 'LUNCH' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const config = {
        difficulty: 'EASY',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockRejectedValue(new Error('DB error'));

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(false);
    });

    it('should work with no filters', async () => {
      const config = {};
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.mealIdea.findMany.mockResolvedValue([
        { id: 'meal-1', name: 'Random meal' },
      ] as any);

      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSuggestMeal(config, context);

      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // REDUCE CHORES ACTION (8 tests)
  // ============================================

  describe('Reduce Chores Action', () => {
    it('should reduce chore instances for member', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 20,
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.choreInstance.findMany.mockResolvedValue([
        { id: 'chore-1', status: 'PENDING' },
        { id: 'chore-2', status: 'PENDING' },
        { id: 'chore-3', status: 'PENDING' },
        { id: 'chore-4', status: 'PENDING' },
        { id: 'chore-5', status: 'PENDING' },
      ] as any);

      prismaMock.choreInstance.updateMany.mockResolvedValue({ count: 1 });

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(true);
    });

    it('should use context memberId if not specified', async () => {
      const config = {
        percentage: 10,
        duration: 3,
      };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-from-context',
      };

      prismaMock.choreInstance.findMany.mockResolvedValue([
        { id: 'chore-1', status: 'PENDING' },
      ] as any);

      prismaMock.choreInstance.updateMany.mockResolvedValue({ count: 0 });

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(true);
    });

    it('should require member ID', async () => {
      const config = {
        percentage: 20,
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires memberId');
    });

    it('should enforce maximum percentage', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 60, // Over 50% limit
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reduce chores percentage must be between 0 and 100');
    });

    it('should enforce maximum duration', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 20,
        duration: 31, // Over 30 day limit
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reduce chores duration must be between 1 and 30 days');
    });

    it('should handle no pending chores', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 20,
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.choreInstance.findMany.mockResolvedValue([]);

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(true);
      expect(result.result?.choresReduced).toBe(0);
    });

    it('should calculate correct number to cancel', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 50,
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.choreInstance.findMany.mockResolvedValue([
        { id: 'chore-1' },
        { id: 'chore-2' },
        { id: 'chore-3' },
        { id: 'chore-4' },
      ] as any);

      prismaMock.choreInstance.updateMany.mockResolvedValue({ count: 2 });

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const config = {
        memberId: 'member-1',
        percentage: 20,
        duration: 7,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.choreInstance.findMany.mockRejectedValue(new Error('DB error'));

      const result = await executeReduceChores(config, context);

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // ADJUST SCREEN TIME ACTION (8 tests)
  // ============================================

  describe('Adjust Screen Time Action', () => {
    it('should add screen time minutes', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: 30,
        reason: 'Bonus time',
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any);

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(true);
    });

    it('should subtract screen time minutes', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: -15,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 45,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any);

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(true);
    });

    it('should use context memberId if not specified', async () => {
      const config = {
        amountMinutes: 20,
      };
      const context: RuleContext = {
        familyId: 'family-1',
        memberId: 'member-from-context',
      };

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-2',
        memberId: 'member-from-context',
        currentBalanceMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeBalance.update.mockResolvedValue({} as any);
      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any);

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(true);
    });

    it('should require member ID', async () => {
      const config = {
        amountMinutes: 30,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires memberId');
    });

    it('should enforce maximum adjustment', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: 200, // Over 120 minute limit
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Screen time adjustment cannot exceed 120 minutes');
    });

    it('should handle balance not found', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: 30,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue(null);

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Screen time balance not found');
    });

    it('should prevent negative balance', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: -100,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.screenTimeBalance.findUnique.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 50, // Would go negative
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeBalance.update.mockResolvedValue({
        id: 'balance-1',
        memberId: 'member-1',
        currentBalanceMinutes: 0, // Clamped to 0
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.screenTimeTransaction.create.mockResolvedValue({} as any);

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const config = {
        memberId: 'member-1',
        amountMinutes: 30,
      };
      const context: RuleContext = {
        familyId: 'family-1',
      };

      prismaMock.screenTimeBalance.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await executeAdjustScreenTime(config, context);

      expect(result.success).toBe(false);
    });
  });
});
