/**
 * Integration tests for /api/rules route
 * Tests GET (list rules) and POST (create rule) endpoints
 *
 * Following TDD approach - these tests are written BEFORE implementation
 */

// CRITICAL: Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the rules engine validation
jest.mock('@/lib/rules-engine/validation', () => ({
  validateRuleConfiguration: jest.fn(() => ({ valid: true })),
  validateRuleName: jest.fn(() => ({ valid: true })),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/rules/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');
const { validateRuleConfiguration } = require('@/lib/rules-engine/validation');

describe('GET /api/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toContain('Forbidden');
  });

  // ============================================
  // SUCCESS TESTS
  // ============================================

  it('should return empty array if no rules exist', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.rules).toEqual([]);
    expect(data.total).toBe(0);
  });

  it('should return all family rules for parent', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRules = [
      {
        id: 'rule-1',
        familyId: session.user.familyId,
        name: 'Test Rule 1',
        description: 'Test description',
        trigger: { type: 'chore_completed', config: {} },
        conditions: null,
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
        isEnabled: true,
        createdById: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: session.user.id, name: 'Test Parent' },
        _count: { executions: 5 },
      },
    ];

    prismaMock.automationRule.findMany.mockResolvedValue(mockRules as any);
    prismaMock.automationRule.count.mockResolvedValue(1);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.rules).toHaveLength(1);
    expect(data.rules[0].id).toBe('rule-1');
    expect(data.total).toBe(1);
  });

  it('should not return rules from other families', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyId: session.user.familyId,
        }),
      })
    );
  });

  // ============================================
  // FILTERING TESTS
  // ============================================

  it('should filter by isEnabled=true', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules?enabled=true', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isEnabled: true,
        }),
      })
    );
  });

  it('should filter by isEnabled=false', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules?enabled=false', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isEnabled: false,
        }),
      })
    );
  });

  // ============================================
  // PAGINATION TESTS
  // ============================================

  it('should support pagination with limit', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules?limit=10', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    );
  });

  it('should support pagination with offset', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules?offset=20', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
      })
    );
  });

  it('should cap limit at maximum value', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules?limit=999', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: expect.any(Number),
      })
    );

    const call = prismaMock.automationRule.findMany.mock.calls[0][0];
    expect(call.take).toBeLessThanOrEqual(100); // Max limit should be capped
  });

  // ============================================
  // ORDERING TESTS
  // ============================================

  it('should order by createdAt desc by default', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    );
  });

  it('should include execution count in response', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.automationRule.findMany.mockResolvedValue([]);
    prismaMock.automationRule.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/rules', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.automationRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: expect.objectContaining({
            select: { executions: true },
          }),
        }),
      })
    );
  });
});

describe('POST /api/rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    validateRuleConfiguration.mockReturnValue({ valid: true });
  });

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not a parent', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  // ============================================
  // VALIDATION TESTS - NAME
  // ============================================

  it('should return 400 if name is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('name');
  });

  it('should return 400 if name is empty string', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '   ',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should trim whitespace from name', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '  Test Rule  ',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.automationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Test Rule',
        }),
      })
    );
  });

  // ============================================
  // VALIDATION TESTS - TRIGGER
  // ============================================

  it('should return 400 if trigger is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Trigger');
  });

  it('should return 400 if trigger is not an object', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: 'invalid',
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  // ============================================
  // VALIDATION TESTS - ACTIONS
  // ============================================

  it('should return 400 if actions is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Actions');
  });

  it('should return 400 if actions is not an array', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: 'invalid',
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 400 if actions array is empty', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  // ============================================
  // VALIDATION TESTS - CONFIGURATION
  // ============================================

  it('should return 400 if rule configuration is invalid', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    validateRuleConfiguration.mockReturnValue({
      valid: false,
      error: 'Invalid trigger configuration',
    });

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'invalid_type', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Invalid trigger configuration');
  });

  // ============================================
  // SUCCESS TESTS
  // ============================================

  it('should create rule with valid data', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      description: null,
      trigger: { type: 'chore_completed', config: { anyChore: true } },
      conditions: null,
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: { anyChore: true } },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.rule.id).toBe('rule-1');
  });

  it('should create rule with description', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      description: 'Test description',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        description: 'Test description',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.automationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          description: 'Test description',
        }),
      })
    );
  });

  it('should create rule with conditions', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      conditions: { operator: 'AND', rules: [{ field: 'completionRate', operator: 'equals', value: 100 }] },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        conditions: { operator: 'AND', rules: [{ field: 'completionRate', operator: 'equals', value: 100 }] },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.automationRule.create).toHaveBeenCalled();
  });

  it('should default isEnabled to true', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.automationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isEnabled: true,
        }),
      })
    );
  });

  it('should set createdById to current user', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.automationRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdById: session.user.id,
        }),
      })
    );
  });

  it('should create audit log for RULE_CREATED', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_CREATED',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
          result: 'SUCCESS',
        }),
      })
    );
  });

  it('should return created rule with id', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [{ type: 'award_credits', config: { amount: 10 } }],
      }),
    }) as NextRequest;

    const response = await POST(request);
    const data = await response.json();

    expect(data.rule).toBeDefined();
    expect(data.rule.id).toBe('rule-1');
    expect(data.rule.name).toBe('Test Rule');
  });

  // ============================================
  // MULTIPLE ACTIONS TEST
  // ============================================

  it('should allow multiple actions', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const mockRule = {
      id: 'rule-1',
      familyId: session.user.familyId,
      name: 'Test Rule',
      trigger: { type: 'chore_completed', config: {} },
      actions: [
        { type: 'award_credits', config: { amount: 10 } },
        { type: 'send_notification', config: { recipients: ['child'], title: 'Great job!', message: 'You earned credits!' } },
      ],
      isEnabled: true,
      createdById: session.user.id,
      creator: { id: session.user.id, name: 'Test Parent' },
    };

    prismaMock.automationRule.create.mockResolvedValue(mockRule as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Rule',
        trigger: { type: 'chore_completed', config: {} },
        actions: [
          { type: 'award_credits', config: { amount: 10 } },
          { type: 'send_notification', config: { recipients: ['child'], title: 'Great job!', message: 'You earned credits!' } },
        ],
      }),
    }) as NextRequest;

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
