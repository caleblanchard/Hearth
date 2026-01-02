/**
 * Integration Tests: /api/rules/[id]/toggle
 *
 * PATCH - Toggle rule enabled/disabled state
 *
 * TDD Red Phase: Write tests first
 */

// CRITICAL: Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/rules/[id]/toggle/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('PATCH /api/rules/[id]/toggle', () => {
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
  };

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {
    auth.mockResolvedValue(mockChildSession() as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return 404 if rule not found', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
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

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should toggle enabled rule to disabled', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.automationRule.update.mockResolvedValue({
      ...mockRule,
      isEnabled: false,
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rule.isEnabled).toBe(false);
    expect(prismaMock.automationRule.update).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
      data: { isEnabled: false },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  it('should toggle disabled rule to enabled', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue({
      ...mockRule,
      isEnabled: false,
    } as any);
    prismaMock.automationRule.update.mockResolvedValue({
      ...mockRule,
      isEnabled: true,
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.rule.isEnabled).toBe(true);
    expect(prismaMock.automationRule.update).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
      data: { isEnabled: true },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });

  it('should create RULE_ENABLED audit log when enabling', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue({
      ...mockRule,
      isEnabled: false,
    } as any);
    prismaMock.automationRule.update.mockResolvedValue({
      ...mockRule,
      isEnabled: true,
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    await PATCH(request, { params: { id: 'rule-1' } });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_ENABLED',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
          result: 'SUCCESS',
        }),
      })
    );
  });

  it('should create RULE_DISABLED audit log when disabling', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.automationRule.update.mockResolvedValue({
      ...mockRule,
      isEnabled: false,
    } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    await PATCH(request, { params: { id: 'rule-1' } });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'RULE_DISABLED',
          entityType: 'AutomationRule',
          entityId: 'rule-1',
          result: 'SUCCESS',
        }),
      })
    );
  });

  it('should return 500 on database error', async () => {
    auth.mockResolvedValue(mockParentSession() as any);
    prismaMock.automationRule.findUnique.mockResolvedValue(mockRule as any);
    prismaMock.automationRule.update.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/rules/rule-1/toggle', {
      method: 'PATCH',
    });
    const response = await PATCH(request, { params: { id: 'rule-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to toggle rule');
  });
});
