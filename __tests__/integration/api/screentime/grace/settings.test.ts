// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/screentime/grace/settings/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { GraceRepaymentMode } from '@/app/generated/prisma';

const { auth } = require('@/lib/auth');

describe('/api/screentime/grace/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new Request('http://localhost/api/screentime/grace/settings');
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return settings for current user', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const settings = {
        id: 'settings-1',
        memberId: session.user.id,
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);

      const request = new Request('http://localhost/api/screentime/grace/settings');
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(settings);
    });

    it('should allow parents to view child settings', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const childId = 'child-1';
      const settings = {
        id: 'settings-1',
        memberId: childId,
        gracePeriodMinutes: 20,
        maxGracePerDay: 2,
        maxGracePerWeek: 5,
        graceRepaymentMode: GraceRepaymentMode.EARN_BACK,
        lowBalanceWarningMinutes: 15,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock member check
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: childId,
        name: 'Test Child',
        email: null,
        role: 'CHILD' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(settings);

      const request = new Request(
        `http://localhost/api/screentime/grace/settings?memberId=${childId}`
      );
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(settings);
    });

    it('should prevent children from viewing other members settings', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const otherChildId = 'other-child';

      // Mock member check
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: otherChildId,
        name: 'Other Child',
        email: null,
        role: 'CHILD' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-2',
      });

      const request = new Request(
        `http://localhost/api/screentime/grace/settings?memberId=${otherChildId}`
      );
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Cannot view');
    });

    it('should create default settings if none exist', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const defaultSettings = {
        id: 'new-settings-1',
        memberId: session.user.id,
        gracePeriodMinutes: 15,
        maxGracePerDay: 1,
        maxGracePerWeek: 3,
        graceRepaymentMode: GraceRepaymentMode.DEDUCT_NEXT_WEEK,
        lowBalanceWarningMinutes: 10,
        requiresApproval: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.screenTimeGraceSettings.findUnique.mockResolvedValue(null);
      prismaMock.screenTimeGraceSettings.create.mockResolvedValue(defaultSettings);

      const request = new Request('http://localhost/api/screentime/grace/settings');
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(defaultSettings);
      expect(prismaMock.screenTimeGraceSettings.create).toHaveBeenCalled();
    });

    it('should verify family ownership when viewing child settings', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const otherFamilyChildId = 'other-family-child';

      // Mock member from different family
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: otherFamilyChildId,
        name: 'Other Family Child',
        email: null,
        role: 'CHILD' as any,
        familyId: 'different-family',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-3',
      });

      const request = new Request(
        `http://localhost/api/screentime/grace/settings?memberId=${otherFamilyChildId}`
      );
      const response = await GET(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Cannot view settings from other families');
    });
  });

  describe('PUT', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'child-1', gracePeriodMinutes: 20 }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({ memberId: 'child-1', gracePeriodMinutes: 20 }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('parent');
    });

    it('should validate positive numbers', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Test Child',
        email: null,
        role: 'CHILD' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: -5, // Invalid: negative
          maxGracePerDay: 1,
          maxGracePerWeek: 3,
          graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
          lowBalanceWarningMinutes: 10,
          requiresApproval: false,
        }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('positive');
    });

    it('should validate enum values', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Test Child',
        email: null,
        role: 'CHILD' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: 15,
          maxGracePerDay: 1,
          maxGracePerWeek: 3,
          graceRepaymentMode: 'INVALID_MODE', // Invalid enum
          lowBalanceWarningMinutes: 10,
          requiresApproval: false,
        }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('repayment mode');
    });

    it('should update settings successfully', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const updatedSettings = {
        id: 'settings-1',
        memberId: 'child-1',
        gracePeriodMinutes: 20,
        maxGracePerDay: 2,
        maxGracePerWeek: 5,
        graceRepaymentMode: GraceRepaymentMode.FORGIVE,
        lowBalanceWarningMinutes: 15,
        requiresApproval: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Test Child',
        email: null,
        role: 'CHILD' as any,
        familyId: session.user.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      prismaMock.screenTimeGraceSettings.upsert.mockResolvedValue(updatedSettings);

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: 20,
          maxGracePerDay: 2,
          maxGracePerWeek: 5,
          graceRepaymentMode: 'FORGIVE',
          lowBalanceWarningMinutes: 15,
          requiresApproval: true,
        }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.settings).toEqual(updatedSettings);
      expect(prismaMock.screenTimeGraceSettings.upsert).toHaveBeenCalled();
    });

    it('should verify family ownership', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-1',
        name: 'Test Child',
        email: null,
        role: 'CHILD' as any,
        familyId: 'different-family',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1',
      });

      const request = new Request('http://localhost/api/screentime/grace/settings', {
        method: 'PUT',
        body: JSON.stringify({
          memberId: 'child-1',
          gracePeriodMinutes: 20,
          maxGracePerDay: 2,
          maxGracePerWeek: 5,
          graceRepaymentMode: 'DEDUCT_NEXT_WEEK',
          lowBalanceWarningMinutes: 15,
          requiresApproval: false,
        }),
      });
      const response = await PUT(request as NextRequest);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Cannot update settings for members from other families');
    });
  });
});
