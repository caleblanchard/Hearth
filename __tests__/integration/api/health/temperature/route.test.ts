// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/health/temperature/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/health/temperature', () => {
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

  const mockTempLog = {
    id: 'temp-log-1',
    memberId: 'child-test-123',
    temperature: 101.5,
    method: 'ORAL',
    recordedAt: new Date('2026-01-01T10:00:00Z'),
    notes: 'Child has fever',
    member: {
      id: 'child-test-123',
      name: 'Child',
      familyId: 'family-test-123',
    },
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to log temperature for another member', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-child-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Children can only log temperature for themselves');
    });

    it('should allow parents to log temperature for any family member', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue(mockTempLog as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
          notes: 'Child has fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.log.temperature).toBe(101.5);
      expect(data.log.method).toBe('ORAL');

      expect(prismaMock.temperatureLog.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
          notes: 'Child has fever',
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

    it('should allow children to log their own temperature', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue({
        ...mockTempLog,
        temperature: 98.6,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 98.6,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.log.temperature).toBe(98.6);
    });

    it('should return 400 if memberId is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member ID is required');
    });

    it('should return 400 if temperature is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Temperature is required');
    });

    it('should return 400 if method is missing', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Method is required');
    });

    it('should return 400 if method is invalid', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'INVALID',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid method');
    });

    it('should return 400 if temperature is too low', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 85.0,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Temperature must be between 90 and 110 degrees Fahrenheit');
    });

    it('should return 400 if temperature is too high', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 115.0,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Temperature must be between 90 and 110 degrees Fahrenheit');
    });

    it('should return 404 if member not found', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'non-existent-member',
          temperature: 101.5,
          method: 'ORAL',
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

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'other-family-child',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should accept all valid temperature methods', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const validMethods = ['ORAL', 'RECTAL', 'ARMPIT', 'EAR', 'FOREHEAD'];

      for (const method of validMethods) {
        prismaMock.temperatureLog.create.mockResolvedValue({
          ...mockTempLog,
          method,
        } as any);

        const request = new NextRequest('http://localhost:3000/api/health/temperature', {
          method: 'POST',
          body: JSON.stringify({
            memberId: 'child-test-123',
            temperature: 98.6,
            method,
          }),
        });
        const response = await POST(request);

        expect(response.status).toBe(201);
        const data = await response.json();
        expect(data.log.method).toBe(method);
      }
    });

    it('should accept optional notes', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue(mockTempLog as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
          notes: 'Child is feeling hot',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.temperatureLog.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
          notes: 'Child is feeling hot',
        },
        include: expect.any(Object),
      });
    });

    it('should log audit event on successful creation', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue(mockTempLog as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'TEMPERATURE_LOGGED',
          entityType: 'TemperatureLog',
          entityId: 'temp-log-1',
          result: 'SUCCESS',
        },
      });
    });

    describe('Sick Mode Auto-Trigger', () => {
      it('should auto-trigger sick mode when temperature exceeds threshold', async () => {
        mockAuth.mockResolvedValue(mockParentSession as any);
        prismaMock.familyMember.findUnique.mockResolvedValue({
          id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue({
        id: 'temp-log-1',
        memberId: 'child-test-123',
        temperature: 101.5,
        method: 'ORAL',
        recordedAt: new Date(),
      } as any);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-test-123',
        autoEnableOnTemperature: true,
        temperatureThreshold: 100.4,
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue(null);
      prismaMock.healthEvent.findFirst.mockResolvedValue(null);
      prismaMock.healthEvent.create.mockResolvedValue({
        id: 'health-event-1',
        memberId: 'child-test-123',
        eventType: 'ILLNESS',
      } as any);
      prismaMock.sickModeInstance.create.mockResolvedValue({
        id: 'sick-mode-1',
        memberId: 'child-test-123',
        triggeredBy: 'AUTO_FROM_HEALTH_EVENT',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sickModeTriggered).toBe(true);
      expect(prismaMock.sickModeInstance.create).toHaveBeenCalled();
    });

    it('should not auto-trigger if temperature is below threshold', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue({
        id: 'temp-log-1',
        memberId: 'child-test-123',
        temperature: 99.5,
        method: 'ORAL',
        recordedAt: new Date(),
      } as any);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-test-123',
        autoEnableOnTemperature: true,
        temperatureThreshold: 100.4,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 99.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sickModeTriggered).toBe(false);
      expect(prismaMock.sickModeInstance.create).not.toHaveBeenCalled();
    });

    it('should not auto-trigger if setting is disabled', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue({
        id: 'temp-log-1',
        memberId: 'child-test-123',
        temperature: 101.5,
        method: 'ORAL',
        recordedAt: new Date(),
      } as any);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-test-123',
        autoEnableOnTemperature: false,
        temperatureThreshold: 100.4,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sickModeTriggered).toBe(false);
      expect(prismaMock.sickModeInstance.create).not.toHaveBeenCalled();
    });

    it('should not auto-trigger if sick mode already active', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);
      prismaMock.temperatureLog.create.mockResolvedValue({
        id: 'temp-log-1',
        memberId: 'child-test-123',
        temperature: 101.5,
        method: 'ORAL',
        recordedAt: new Date(),
      } as any);
      prismaMock.sickModeSettings.findUnique.mockResolvedValue({
        id: 'settings-1',
        familyId: 'family-test-123',
        autoEnableOnTemperature: true,
        temperatureThreshold: 100.4,
      } as any);
      prismaMock.sickModeInstance.findFirst.mockResolvedValue({
        id: 'existing-sick-mode',
        isActive: true,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/temperature', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          temperature: 101.5,
          method: 'ORAL',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.sickModeTriggered).toBe(false);
      expect(prismaMock.sickModeInstance.create).not.toHaveBeenCalled();
    });
  });
  });
});
