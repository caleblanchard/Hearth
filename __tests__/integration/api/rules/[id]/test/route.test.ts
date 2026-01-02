/**
 * Integration Tests: /api/rules/[id]/test
 *
 * POST - Dry-run test a rule with simulated context
 *
 * TDD Red Phase: Write tests first
 */

// CRITICAL: Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the rules engine dry-run function
jest.mock('@/lib/rules-engine', () => ({
  dryRunRule: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/rules/[id]/test/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');
const { dryRunRule } = require('@/lib/rules-engine');

describe('POST /api/rules/[id]/test', () => {
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
    auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {
    auth.mockResolvedValue(mockChildSession() as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 400 if request body is invalid JSON', async () => {
    auth.mockResolvedValue(mockParentSession() as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: 'invalid json',
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });

  it('should return 400 if context is missing', async () => {
    auth.mockResolvedValue(mockParentSession() as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('context');
  });

  it('should return 404 if rule not found', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('should return 403 if rule belongs to different family', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue({
      ...mockRule,
      familyId: 'other-family',
    } as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should perform dry-run and return results', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);

    const dryRunResult = {
      wouldExecute: true,
      triggerEvaluated: true,
      conditionsEvaluated: true,
      actions: [
        {
          type: 'award_credits',
          wouldExecute: true,
          simulation: 'Would award 10 credits to member',
        },
      ],
      errors: [],
      warnings: [],
    };

    dryRunRule.mockResolvedValue(dryRunResult);

    const testContext = {
      memberId: 'member-1',
      choreInstanceId: 'chore-1',
    };

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: testContext }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.result).toEqual(dryRunResult);
    expect(dryRunRule).toHaveBeenCalledWith('rule-1', {
      ...testContext,
      familyId: 'family-test-123',
    });
  });

  it('should include familyId in simulated context', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    dryRunRule.mockResolvedValue({
      wouldExecute: false,
      triggerEvaluated: false,
      conditionsEvaluated: false,
      actions: [],
      errors: [],
      warnings: [],
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: { memberId: 'member-1' } }),
    });
    await POST(request, { params: { id: 'rule-1' } });

    expect(dryRunRule).toHaveBeenCalledWith('rule-1', {
      memberId: 'member-1',
      familyId: 'family-test-123',
    });
  });

  it('should handle dry-run with no actions executed', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);

    dryRunRule.mockResolvedValue({
      wouldExecute: false,
      triggerEvaluated: false,
      conditionsEvaluated: false,
      actions: [],
      errors: [],
      warnings: ['Trigger did not match'],
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.wouldExecute).toBe(false);
    expect(data.result.warnings).toContain('Trigger did not match');
  });

  it('should handle dry-run errors', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);

    dryRunRule.mockResolvedValue({
      wouldExecute: false,
      triggerEvaluated: false,
      conditionsEvaluated: false,
      actions: [],
      errors: ['Invalid trigger configuration'],
      warnings: [],
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.errors).toContain('Invalid trigger configuration');
  });

  it('should create audit log for test run', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    dryRunRule.mockResolvedValue({
      wouldExecute: true,
      triggerEvaluated: true,
      conditionsEvaluated: true,
      actions: [],
      errors: [],
      warnings: [],
    });

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    await POST(request, { params: { id: 'rule-1' } });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_TEST_RUN',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
          result: 'SUCCESS',
        }),
      })
    );
  });

  it('should return 500 on dry-run failure', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    dryRunRule.mockRejectedValue(new Error('Dry-run failed'));

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/test', {
      method: 'POST',
      body: JSON.stringify({ context: {} }),
    });
    const response = await POST(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to test rule');
  });
});
