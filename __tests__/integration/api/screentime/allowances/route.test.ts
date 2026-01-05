// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock screentime-utils
jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/screentime/allowances/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/screentime/allowances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/allowances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all allowances for family', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockAllowances = [
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          rolloverEnabled: true,
          rolloverCapMinutes: 60,
          member: { id: 'child-1', name: 'Child 1' },
          screenTimeType: { id: 'type-1', name: 'Educational', description: null, isActive: true },
        },
      ];

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue(mockAllowances as any);

      const request = new NextRequest('http://localhost/api/screentime/allowances');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowances).toHaveLength(1);
      expect(data.allowances[0].allowanceMinutes).toBe(120);
    });

    it('should filter by memberId if provided', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/screentime/allowances?memberId=child-1');
      await GET(request);

      expect(prismaMock.screenTimeAllowance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberId: 'child-1',
          }),
        })
      );
    });

    it('should filter by screenTimeTypeId if provided', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/screentime/allowances?screenTimeTypeId=type-1');
      await GET(request);

      expect(prismaMock.screenTimeAllowance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            screenTimeTypeId: 'type-1',
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can manage screen time allowances');
    });

    it('should return 400 if required fields are missing', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          // Missing screenTimeTypeId, allowanceMinutes, period
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return 400 if allowanceMinutes is negative', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: -10,
          period: 'WEEKLY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Allowance minutes must be non-negative');
    });

    it('should return 400 if member does not belong to family', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Member not found or does not belong to your family');
    });

    it('should return 400 if screen time type not found or archived', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any);

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Screen time type not found or is archived');
    });

    it('should create a new allowance', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any);

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any);

      const mockAllowance = {
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 120,
        period: 'WEEKLY',
        rolloverEnabled: false,
        rolloverCapMinutes: null,
        member: { id: 'child-1', name: 'Child 1' },
        screenTimeType: { id: 'type-1', name: 'Educational', description: null, isActive: true },
      };

      prismaMock.screenTimeAllowance.upsert.mockResolvedValue(mockAllowance as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          rolloverEnabled: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowance.allowanceMinutes).toBe(120);
      expect(data.message).toContain('saved successfully');
      expect(prismaMock.screenTimeAllowance.upsert).toHaveBeenCalled();
    });

    it('should update existing allowance if it exists', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any);

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any);

      const mockAllowance = {
        id: 'allowance-1',
        memberId: 'child-1',
        screenTimeTypeId: 'type-1',
        allowanceMinutes: 180, // Updated from 120
        period: 'WEEKLY',
        rolloverEnabled: true,
        rolloverCapMinutes: 60,
        member: { id: 'child-1', name: 'Child 1' },
        screenTimeType: { id: 'type-1', name: 'Educational', description: null, isActive: true },
      };

      prismaMock.screenTimeAllowance.upsert.mockResolvedValue(mockAllowance as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 180,
          period: 'WEEKLY',
          rolloverEnabled: true,
          rolloverCapMinutes: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowance.allowanceMinutes).toBe(180);
      expect(data.allowance.rolloverEnabled).toBe(true);
      expect(data.allowance.rolloverCapMinutes).toBe(60);
    });

    it('should return 400 if rolloverCapMinutes is negative when rolloverEnabled is true', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
      } as any);

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'type-1',
        familyId: session.user.familyId,
        isArchived: false,
      } as any);

      const request = new NextRequest('http://localhost/api/screentime/allowances', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          rolloverEnabled: true,
          rolloverCapMinutes: -10,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Rollover cap must be non-negative');
    });
  });
});
