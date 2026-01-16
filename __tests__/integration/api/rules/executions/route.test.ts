/**
 * Integration Tests: /api/rules/executions
 *
 * GET - Get execution history across all rules
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
import { GET } from '@/app/api/rules/executions/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/rules/executions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockExecutions = [
    {
      id: 'exec-1',
      ruleId: 'rule-1',
      success: true,
      result: { actionsCompleted: 1, actionsFailed: 0 },
      error: null,
      metadata: { triggerType: 'chore_completed' },
      executedAt: new Date('2024-01-02'),
      rule: {
        id: 'rule-1',
        name: 'Test Rule 1',
        familyId: 'family-test-123',
      },
    },
    {
      id: 'exec-2',
      ruleId: 'rule-2',
      success: false,
      result: { actionsCompleted: 0, actionsFailed: 1 },
      error: 'Action failed',
      metadata: { triggerType: 'chore_streak' },
      executedAt: new Date('2024-01-01'),
      rule: {
        id: 'rule-2',
        name: 'Test Rule 2',
        familyId: 'family-test-123',
      },
    },
  ];

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 403 if user is not a parent', async () => {

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('should return all executions for family', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue(mockExecutions as any);
    prismaMock.ruleExecution.count.mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rule: { familyId: 'family-test-123' },
        }),
      })
    );
  });

  it('should support pagination', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([mockExecutions[0]] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/rules/executions?limit=1&offset=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(1);
    expect(data.offset).toBe(1);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
        skip: 1,
      })
    );
  });

  it('should filter by ruleId', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([mockExecutions[0]] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/rules/executions?ruleId=rule-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ruleId: 'rule-1',
        }),
      })
    );
  });

  it('should filter by success status', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([mockExecutions[0]] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/rules/executions?success=true');
    const response = await GET(request);
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

  it('should filter by date range', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue(mockExecutions as any);
    prismaMock.ruleExecution.count.mockResolvedValue(2);

    const request = new NextRequest(
      'http://localhost:3000/api/rules/executions?startDate=2024-01-01&endDate=2024-01-31'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          executedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('should order by executedAt descending by default', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue(mockExecutions as any);
    prismaMock.ruleExecution.count.mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { executedAt: 'desc' },
      })
    );
  });

  it('should include rule information in executions', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue(mockExecutions as any);
    prismaMock.ruleExecution.count.mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.executions[0].rule).toBeDefined();
    expect(data.executions[0].rule.name).toBe('Test Rule 1');
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          rule: expect.objectContaining({
            select: expect.any(Object),
          }),
        }),
      })
    );
  });

  it('should enforce maximum limit of 100', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/rules/executions?limit=200');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(100);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  it('should enforce minimum limit of 1', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/rules/executions?limit=0');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(1);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
      })
    );
  });

  it('should combine multiple filters', async () => {
    prismaMock.ruleExecution.findMany.mockResolvedValue([mockExecutions[0]] as any);
    prismaMock.ruleExecution.count.mockResolvedValue(1);

    const request = new NextRequest(
      'http://localhost:3000/api/rules/executions?ruleId=rule-1&success=true&limit=10&offset=0'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prismaMock.ruleExecution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ruleId: 'rule-1',
          success: true,
        }),
        take: 10,
        skip: 0,
      })
    );
  });

  it('should return 500 on database error', async () => {
    prismaMock.ruleExecution.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/rules/executions');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Failed to fetch executions');
  });
});
