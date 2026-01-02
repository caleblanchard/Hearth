// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/medications/dose/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/medications/dose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockSession = {
    user: {
      id: 'parent-test-123',
      familyId: 'family-test-123',
      role: 'PARENT' as const,
    },
  };

  const mockMedicationSafety = {
    id: 'med-1',
    memberId: 'child-test-123',
    medicationName: 'Children\'s Tylenol',
    activeIngredient: 'Acetaminophen',
    minIntervalHours: 4,
    maxDosesPerDay: 5,
    lastDoseAt: null,
    nextDoseAvailableAt: null,
    notifyWhenReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'child-test-123',
      name: 'Child',
      familyId: 'family-test-123',
    },
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 if missing required fields', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          // Missing dosage
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Medication Safety ID and dosage are required');
    });

    it('should return 404 if medication safety config not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.medicationSafety.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'invalid-med-123',
          dosage: '5ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
    });

    it('should return 403 if member belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.medicationSafety.findUnique.mockResolvedValue({
        ...mockMedicationSafety,
        member: {
          ...mockMedicationSafety.member,
          familyId: 'different-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 if dose locked due to minimum interval', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      // Next dose available 2 hours from now
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      prismaMock.medicationSafety.findUnique.mockResolvedValue({
        ...mockMedicationSafety,
        nextDoseAvailableAt: futureTime,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Dose locked - minimum interval not met');
      expect(data.locked).toBe(true);
      expect(data.hoursRemaining).toBeDefined();
    });

    it('should return 400 if daily maximum reached', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      prismaMock.medicationSafety.findUnique.mockResolvedValue(mockMedicationSafety as any);

      // Mock 5 doses today (equal to maxDosesPerDay)
      prismaMock.medicationDose.count.mockResolvedValue(5);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Daily maximum of 5 doses reached');
      expect(data.locked).toBe(true);
      expect(data.dosesToday).toBe(5);
      expect(data.maxDosesPerDay).toBe(5);
    });

    it('should return 403 if override attempted by non-parent', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'child-test-123',
          familyId: 'family-test-123',
          role: 'CHILD',
        },
      } as any);

      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      prismaMock.medicationSafety.findUnique.mockResolvedValue({
        ...mockMedicationSafety,
        nextDoseAvailableAt: futureTime,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
          override: true,
          overrideReason: 'Emergency',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can override medication safety interlock');
    });

    it('should return 400 if override without reason', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      prismaMock.medicationSafety.findUnique.mockResolvedValue({
        ...mockMedicationSafety,
        nextDoseAvailableAt: futureTime,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
          override: true,
          // Missing overrideReason
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Override reason is required');
    });

    it('should log dose successfully when safe', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      prismaMock.medicationSafety.findUnique.mockResolvedValue(mockMedicationSafety as any);
      prismaMock.medicationDose.count.mockResolvedValue(0);

      const newDose = {
        id: 'dose-1',
        medicationSafetyId: 'med-1',
        givenAt: new Date(),
        givenBy: 'parent-test-123',
        dosage: '5ml',
        notes: 'Fever',
        wasOverride: false,
        overrideReason: null,
        overrideApprovedBy: null,
      };

      prismaMock.medicationDose.create.mockResolvedValue(newDose as any);
      prismaMock.medicationSafety.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
          notes: 'Fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.dose.dosage).toBe('5ml');
      expect(data.message).toBe('Dose logged successfully');
      expect(data.nextDoseAvailableAt).toBeDefined();

      // Verify dose was created
      expect(prismaMock.medicationDose.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          medicationSafetyId: 'med-1',
          givenBy: 'parent-test-123',
          dosage: '5ml',
          notes: 'Fever',
          wasOverride: false,
          overrideReason: null,
          overrideApprovedBy: null,
        }),
      });

      // Verify medication safety was updated with next dose time
      expect(prismaMock.medicationSafety.update).toHaveBeenCalledWith({
        where: { id: 'med-1' },
        data: expect.objectContaining({
          lastDoseAt: expect.any(Date),
          nextDoseAvailableAt: expect.any(Date),
        }),
      });

      // Verify audit log
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MEDICATION_DOSE_LOGGED',
          result: 'SUCCESS',
          metadata: {
            doseId: 'dose-1',
            medicationName: 'Children\'s Tylenol',
            memberName: 'Child',
            dosage: '5ml',
            wasOverride: false,
          },
        },
      });
    });

    it('should allow override with valid reason by parent', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      prismaMock.medicationSafety.findUnique.mockResolvedValue({
        ...mockMedicationSafety,
        nextDoseAvailableAt: futureTime,
      } as any);
      prismaMock.medicationDose.count.mockResolvedValue(0);

      const overrideDose = {
        id: 'dose-2',
        medicationSafetyId: 'med-1',
        givenAt: new Date(),
        givenBy: 'parent-test-123',
        dosage: '5ml',
        notes: 'High fever',
        wasOverride: true,
        overrideReason: 'Doctor ordered early dose due to high fever',
        overrideApprovedBy: 'parent-test-123',
      };

      prismaMock.medicationDose.create.mockResolvedValue(overrideDose as any);
      prismaMock.medicationSafety.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
          notes: 'High fever',
          override: true,
          overrideReason: 'Doctor ordered early dose due to high fever',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.dose.wasOverride).toBe(true);
      expect(data.dose.overrideReason).toBe('Doctor ordered early dose due to high fever');

      // Verify audit log shows override
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MEDICATION_DOSE_OVERRIDE',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            wasOverride: true,
          }),
        },
      });
    });

    it('should calculate next dose time correctly', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const medWith6HourInterval = {
        ...mockMedicationSafety,
        minIntervalHours: 6,
      };

      prismaMock.medicationSafety.findUnique.mockResolvedValue(medWith6HourInterval as any);
      prismaMock.medicationDose.count.mockResolvedValue(0);
      prismaMock.medicationDose.create.mockResolvedValue({
        id: 'dose-3',
        medicationSafetyId: 'med-1',
        givenAt: new Date(),
        givenBy: 'parent-test-123',
        dosage: '10ml',
        notes: null,
        wasOverride: false,
        overrideReason: null,
        overrideApprovedBy: null,
      } as any);
      prismaMock.medicationSafety.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '10ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify the next dose time was set to 6 hours from now
      const updateCall = (prismaMock.medicationSafety.update as jest.Mock).mock.calls[0][0];
      const nextDoseTime = updateCall.data.nextDoseAvailableAt as Date;
      const now = new Date();
      const expectedTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(nextDoseTime.getTime() - expectedTime.getTime())).toBeLessThan(1000);
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.medicationSafety.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/medications/dose', {
        method: 'POST',
        body: JSON.stringify({
          medicationSafetyId: 'med-1',
          dosage: '5ml',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to log medication dose');
    });
  });
});
