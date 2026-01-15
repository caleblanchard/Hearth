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
import { GET } from '@/app/api/screentime/allowances/[memberId]/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';

const { calculateRemainingTime } = require('@/lib/screentime-utils');

describe('/api/screentime/allowances/[memberId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if member not found', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Member not found or does not belong to your family');
    });

    it('should return 404 if member belongs to different family', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: 'different-family',
      } as any);

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Member not found or does not belong to your family');
    });

    it('should return allowances with remaining time calculations', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
        name: 'Child 1',
      } as any);

      const mockAllowances = [
        {
          id: 'allowance-1',
          memberId: 'child-1',
          screenTimeTypeId: 'type-1',
          allowanceMinutes: 120,
          period: 'WEEKLY',
          rolloverEnabled: true,
          rolloverCapMinutes: 60,
          screenTimeType: {
            id: 'type-1',
            name: 'Educational',
            description: 'Educational content',
          },
        },
      ];

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue(mockAllowances as any);

      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 60,
        usedMinutes: 60,
        rolloverMinutes: 0,
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-08'),
      });

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.member.name).toBe('Child 1');
      expect(data.allowances).toHaveLength(1);
      expect(data.allowances[0].remaining.remainingMinutes).toBe(60);
      expect(data.allowances[0].remaining.usedMinutes).toBe(60);
      expect(calculateRemainingTime).toHaveBeenCalledWith('child-1', 'type-1');
    });

    it('should only return allowances for active, non-archived types', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
        name: 'Child 1',
      } as any);

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([]);
      calculateRemainingTime.mockResolvedValue({
        remainingMinutes: 0,
        usedMinutes: 0,
        rolloverMinutes: 0,
        periodStart: new Date(),
        periodEnd: new Date(),
      });

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });

      expect(prismaMock.screenTimeAllowance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberId: 'child-1',
            screenTimeType: {
              isActive: true,
              isArchived: false,
            },
          }),
        })
      );
    });

    it('should handle member with no allowances', async () => {
      const session = mockParentSession();

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        familyId: session.user.familyId,
        name: 'Child 1',
      } as any);

      prismaMock.screenTimeAllowance.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowances).toEqual([]);
    });
  });
});
