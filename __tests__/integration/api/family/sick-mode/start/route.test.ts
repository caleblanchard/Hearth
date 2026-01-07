// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/family/sick-mode/start/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/family/sick-mode/start', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockParentSession = {
    user: {
      id: 'parent-test-123',
      familyId: 'family-test-123',
      role: 'PARENT' as const,
    },
  };

  const mockChildSession = {
    user: {
      id: 'child-test-123',
      familyId: 'family-test-123',
      role: 'CHILD' as const,
    },
  };

  const mockSickModeSettings = {
    id: 'settings-1',
    familyId: 'family-test-123',
    autoEnableOnTemperature: true,
    temperatureThreshold: 100.4,
    autoDisableAfter24Hours: false,
    pauseChores: true,
    pauseScreenTimeTracking: true,
    screenTimeBonus: 120,
    skipMorningRoutine: true,
    skipBedtimeRoutine: false,
    muteNonEssentialNotifs: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSickModeInstance = {
    id: 'instance-1',
    familyId: 'family-test-123',
    memberId: 'child-test-123',
    startedAt: new Date(),
    endedAt: null,
    endedById: null,
    triggeredBy: 'MANUAL',
    healthEventId: null,
    notes: 'Child is sick',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'child-test-123',
      name: 'Child',
    },
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to start sick mode for another member', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-child-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Children can only start sick mode for themselves');
    });

    it('should allow parents to start sick mode for any family member', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.sickModeInstance.create.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          notes: 'Child is sick',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.instance.memberId).toBe('child-test-123');
      expect(data.instance.isActive).toBe(true);

      expect(prismaMock.sickModeInstance.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'child-test-123',
          triggeredBy: 'MANUAL',
          notes: 'Child is sick',
          isActive: true,
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should allow children to start sick mode for themselves', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.sickModeInstance.create.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          notes: 'I am sick',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.instance.memberId).toBe('child-test-123');
    });

    it('should return 400 if memberId is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member ID is required');
    });

    it('should return 404 if member not found', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'non-existent-member',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 404 if member belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'other-family-child',
        familyId: 'other-family-123',
        name: 'Other Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-family-child',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 409 if sick mode already active for member', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('Sick mode is already active for this member');
    });

    it('should accept optional healthEventId when auto-triggered', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.healthEvent.findUnique.mockResolvedValue({
        id: 'health-event-1',
        memberId: 'child-test-123',
      } as any);
      prismaMock.sickModeInstance.create.mockResolvedValue({
        ...mockSickModeInstance,
        triggeredBy: 'AUTO_FROM_HEALTH_EVENT',
        healthEventId: 'health-event-1',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          healthEventId: 'health-event-1',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.sickModeInstance.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'child-test-123',
          triggeredBy: 'AUTO_FROM_HEALTH_EVENT',
          healthEventId: 'health-event-1',
          isActive: true,
        },
        include: expect.any(Object),
      });
    });

    it('should return settings along with instance', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.sickModeInstance.create.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.settings).toBeDefined();
      expect(data.settings.pauseChores).toBe(true);
      expect(data.settings.screenTimeBonus).toBe(120);
    });

    it('should log audit event on successful start', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.sickModeInstance.create.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'SICK_MODE_STARTED',
          entityType: 'SickModeInstance',
          entityId: 'instance-1',
          result: 'SUCCESS',
          metadata: {
            sickMemberId: 'child-test-123',
            triggeredBy: 'MANUAL',
          },
        },
      });
    });

    it('should create default settings if they do not exist', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue(null);
      prismaMock.sickModeSettings.create.mockResolvedValue(mockSickModeSettings as any);
      prismaMock.sickModeInstance.create.mockResolvedValue(mockSickModeInstance as any);

      const request = new NextRequest('http://localhost:3000/api/family/sick-mode/start', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.sickModeSettings.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
        },
      });
    });
  });
});
