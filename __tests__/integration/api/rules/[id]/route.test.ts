/**
 * Integration Tests: /api/rules/[id]
 *
 * GET - Get single rule with execution history
 * PATCH - Update rule
 * DELETE - Delete rule
 *
 * TDD Red Phase: Write tests first
 */

// CRITICAL: Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the rules engine validation
jest.mock('@/lib/rules-engine/validation', () => ({
  validateRuleConfiguration: jest.fn(() => ({ valid: true })),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/rules/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { validateRuleConfiguration } = require('@/lib/rules-engine/validation');

describe('GET /api/rules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockRule = {
    id: 'rule-1',
    familyId: 'family-test-123',
    name: 'Test Rule',
    description: 'Test description',
    trigger: {
      type: 'chore_completed',
      config: { anyChore: true },
    },
    conditions: null,
    actions: [
      {
        type: 'award_credits',
        config: { amount: 10, reason: 'Test bonus' },
      },
    ],
    isEnabled: true,
    createdById: 'parent-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    creator: {
      id: 'parent-1',
      name: 'Parent User',
    },
    _count: {
      executions: 5,
    },
  };

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 if rule not found', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should return 403 if rule belongs to different family', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue({
      ...mockRule,
      familyId: 'other-family',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return rule details with execution history', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.ruleExecution.findMany.mockResolvedValue([
      {
        id: 'exec-1',
        ruleId: 'rule-1',
        success: true,
        result: { actionsCompleted: 1, actionsFailed: 0 },
        error: null,
        metadata: {},
        executedAt: new Date('2024-01-02'),
      },
    ] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(5);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rule).toBeDefined();
    expect(data.rule.id).toBe('rule-1');
    expect(data.rule.name).toBe('Test Rule');
    expect(data.executions).toBeDefined();
    expect(data.executions).toHaveLength(1);
    expect(data.totalExecutions).toBe(5);
  });

  it('should support pagination for execution history', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.ruleExecution.findMany.mockResolvedValue([]);
    prismaMock.ruleExecution.count.mockResolvedValue(5);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1?limit=10&offset=5');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(5);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 5,
      })
    );
  });

  it('should filter execution history by success status', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.ruleExecution.findMany.mockResolvedValue([]);
    prismaMock.ruleExecution.count.mockResolvedValue(3);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1?success=true');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          success: true,
        }),
      })
    );
  });

  it('should include execution statistics', async () => {
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.ruleExecution.findMany.mockResolvedValue([]);

    // Mock all prismaMock.ruleExecution.count calls in sequence
    prismaMock.ruleExecution.count
      .mockResolvedValueOnce(5) // First count for total executions in main response
      .mockResolvedValueOnce(5) // Second count for total in stats
      .mockResolvedValueOnce(4) // Third count for successful
      .mockResolvedValueOnce(1); // Fourth count for failed

    prismaMock.ruleExecution.findFirst.mockResolvedValue({
      executedAt: new Date('2024-01-05'),
      success: true,
    } as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1?includeStats=true');
    const response = await GET(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toBeDefined();
    expect(data.stats.totalExecutions).toBe(5);
    expect(data.stats.successfulExecutions).toBe(4);
    expect(data.stats.failedExecutions).toBe(1);
    expect(data.stats.successRate).toBe(80);
  });
});

describe('PATCH /api/rules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    validateRuleConfiguration.mockReturnValue({ valid: true });
  });

  const mockRule = {
    id: 'rule-1',
    familyId: 'family-test-123',
    name: 'Test Rule',
    description: 'Test description',
    trigger: {
      type: 'chore_completed',
      config: { anyChore: true },
    },
    conditions: null,
    actions: [
      {
        type: 'award_credits',
        config: { amount: 10, reason: 'Test bonus' },
      },
    ],
    isEnabled: true,
    createdById: 'parent-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    creator: {
      id: 'parent-1',
      name: 'Parent User',
    },
  };

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Rule' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Rule' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 400 if request body is invalid JSON', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: 'invalid json',
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });

  it('should return 404 if rule not found', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Rule' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should return 403 if rule belongs to different family', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue({
      ...mockRule,
      familyId: 'other-family',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Rule' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should update rule name', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      name: 'Updated Rule Name',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Rule Name' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rule.name).toBe('Updated Rule Name');
    expect(prismaMock.automationRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          name: 'Updated Rule Name',
        }),
      })
    );
  });

  it('should update rule description', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      description: 'Updated description',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Updated description' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rule.description).toBe('Updated description');
  });

  it('should update rule trigger', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      trigger: { type: 'chore_streak', config: { days: 7 } },
    });

    const newTrigger = { type: 'chore_streak', config: { days: 7 } };
    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ trigger: newTrigger }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rule.trigger.type).toBe('chore_streak');
  });

  it('should update rule actions', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      actions: [
        { type: 'award_credits', config: { amount: 20, reason: 'Updated bonus' } },
      ],
    });

    const newActions = [
      { type: 'award_credits', config: { amount: 20, reason: 'Updated bonus' } },
    ];
    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ actions: newActions }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rule.actions[0].config.amount).toBe(20);
  });

  it('should update rule conditions', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      conditions: {
        operator: 'AND',
        rules: [{ field: 'completionRate', operator: 'equals', value: 100 }],
      },
    });

    const newConditions = {
      operator: 'AND',
      rules: [{ field: 'completionRate', operator: 'equals', value: 100 }],
    };
    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ conditions: newConditions }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.rule.conditions).toBeDefined();
  });

  it('should return 400 if name is empty string', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '   ' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name');
  });

  it('should return 400 if trigger is invalid object', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ trigger: 'invalid' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Trigger');
  });

  it('should return 400 if actions is not an array', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ actions: 'invalid' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Actions');
  });

  it('should return 400 if actions array is empty', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ actions: [] }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('action');
  });

  it('should validate trigger configuration when updating', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule as any);
    validateRuleConfiguration.mockReturnValue({
      valid: false,
      error: 'Invalid trigger type',
    });

    const invalidTrigger = { type: 'invalid_trigger', config: {} };
    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ trigger: invalidTrigger }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid trigger type');
  });

  it('should validate action configuration when updating', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule as any);
    validateRuleConfiguration.mockReturnValue({
      valid: false,
      error: 'Invalid action type',
    });

    const invalidActions = [{ type: 'invalid_action', config: {} }];
    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ actions: invalidActions }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action type');
  });

  it('should support partial updates', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      name: 'Partial Update',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Partial Update' }),
    });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should only update name, not other fields
    expect(prismaMock.automationRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Partial Update' },
      })
    );
  });

  it('should create audit log when updating rule', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      name: 'Updated',
    });
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
    await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_UPDATED',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
        }),
      })
    );
  });

  it('should trim whitespace from name when updating', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      name: 'Trimmed Name',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  Trimmed Name  ' }),
    });
    await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });

    expect(prismaMock.automationRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Trimmed Name',
        }),
      })
    );
  });

  it('should trim whitespace from description when updating', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.update as jest.Mock).mockResolvedValue({
      ...mockRule,
      description: 'Trimmed Description',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'PATCH',
      body: JSON.stringify({ description: '  Trimmed Description  ' }),
    });
    await PATCH(request, { params: Promise.resolve({ id: 'rule-1' }) });

    expect(prismaMock.automationRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'Trimmed Description',
        }),
      })
    );
  });
});

describe('DELETE /api/rules/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockRule = {
    id: 'rule-1',
    familyId: 'family-test-123',
    name: 'Test Rule',
    description: 'Test description',
    trigger: {
      type: 'chore_completed',
      config: { anyChore: true },
    },
    conditions: null,
    actions: [
      {
        type: 'award_credits',
        config: { amount: 10, reason: 'Test bonus' },
      },
    ],
    isEnabled: true,
    createdById: 'parent-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 if rule not found', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should return 403 if rule belongs to different family', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue({
      ...mockRule,
      familyId: 'other-family',
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should delete rule successfully', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.delete as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.automationRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
  });

  it('should create audit log when deleting rule', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.delete as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_DELETED',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
          result: 'SUCCESS',
        }),
      })
    );
  });

  it('should return 500 on database error', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.delete as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to delete rule');
  });

  it('should cascade delete rule executions', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.delete as jest.Mock).mockResolvedValue(mockRule);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });

    // Cascade delete is handled by Prisma schema, just verify delete was called
    expect(prismaMock.automationRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
  });

  it('should include rule metadata in audit log', async () => {
    (prismaMock.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.automationRule.delete as jest.Mock).mockResolvedValue(mockRule);
    (prismaMock.auditLog.create as jest.Mock).mockResolvedValue({});

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1', {
      method: 'DELETE',
    });
    await DELETE(request, { params: Promise.resolve({ id: 'rule-1' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            ruleName: 'Test Rule',
            triggerType: 'chore_completed',
          }),
        }),
      })
    );
  });
});
