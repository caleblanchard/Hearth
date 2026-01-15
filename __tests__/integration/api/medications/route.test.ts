// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/medications/route';

describe('/api/medications', () => {
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

  const mockMedication = {
    id: 'med-1',
    memberId: 'child-test-123',
    medicationName: 'Children\'s Tylenol',
    activeIngredient: 'Acetaminophen',
    minIntervalHours: 4,
    maxDosesPerDay: 5,
    lastDoseAt: new Date('2026-01-01T10:00:00Z'),
    nextDoseAvailableAt: new Date('2026-01-01T14:00:00Z'),
    notifyWhenReady: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    member: {
      id: 'child-test-123',
      name: 'Child',
      familyId: 'family-test-123',
    },
    doses: [
      {
        id: 'dose-1',
        medicationSafetyId: 'med-1',
        givenAt: new Date('2026-01-01T10:00:00Z'),
        givenBy: 'parent-test-123',
        dosage: '5ml',
        notes: 'Fever',
        wasOverride: false,
        overrideReason: null,
        overrideApprovedBy: null,
      },
    ],
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all medications for family', async () => {
      prismaMock.medicationSafety.findMany.mockResolvedValue([mockMedication] as any);

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.medications).toHaveLength(1);
      expect(data.medications[0].medicationName).toBe('Children\'s Tylenol');

      expect(prismaMock.medicationSafety.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: 'family-test-123',
          },
        },
        include: {
          member: {
            select: {
              id: true,
              name: true,
            },
          },
          doses: {
            take: 5,
            orderBy: {
              givenAt: 'desc',
            },
          },
        },
        orderBy: {
          medicationName: 'asc',
        },
      });
    });

    it('should filter by memberId', async () => {
      prismaMock.medicationSafety.findMany.mockResolvedValue([mockMedication] as any);

      const request = new NextRequest('http://localhost:3000/api/medications?memberId=child-test-123', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.medicationSafety.findMany).toHaveBeenCalledWith({
        where: {
          member: {
            familyId: 'family-test-123',
          },
          memberId: 'child-test-123',
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.medicationSafety.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch medications');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          medicationName: 'Tylenol',
          minIntervalHours: 4,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 if missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          // Missing medicationName and minIntervalHours
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member ID, medication name, and minimum interval are required');
    });

    it('should return 400 if member not found', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'invalid-member-123',
          medicationName: 'Tylenol',
          minIntervalHours: 4,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member not found or does not belong to your family');
    });

    it('should return 400 if member belongs to different family', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          medicationName: 'Tylenol',
          minIntervalHours: 4,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Member not found or does not belong to your family');
    });

    it('should create medication successfully', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);

      const newMedication = {
        ...mockMedication,
        lastDoseAt: null,
        nextDoseAvailableAt: null,
        doses: undefined,
      };

      prismaMock.medicationSafety.create.mockResolvedValue(newMedication as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          medicationName: 'Children\'s Tylenol',
          activeIngredient: 'Acetaminophen',
          minIntervalHours: 4,
          maxDosesPerDay: 5,
          notifyWhenReady: true,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.medication.medicationName).toBe('Children\'s Tylenol');
      expect(data.message).toBe('Medication safety configuration created successfully');

      expect(prismaMock.medicationSafety.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          medicationName: 'Children\'s Tylenol',
          activeIngredient: 'Acetaminophen',
          minIntervalHours: 4,
          maxDosesPerDay: 5,
          notifyWhenReady: true,
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

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MEDICATION_SAFETY_CREATED',
          result: 'SUCCESS',
          metadata: {
            medicationId: 'med-1',
            medicationName: 'Children\'s Tylenol',
            memberName: 'Child',
          },
        },
      });
    });

    it('should handle optional fields correctly', async () => {
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
      } as any);

      const minimalMedication = {
        id: 'med-2',
        memberId: 'child-test-123',
        medicationName: 'Simple Med',
        activeIngredient: null,
        minIntervalHours: 6,
        maxDosesPerDay: null,
        lastDoseAt: null,
        nextDoseAvailableAt: null,
        notifyWhenReady: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        member: {
          id: 'child-test-123',
          name: 'Child',
        },
      };

      prismaMock.medicationSafety.create.mockResolvedValue(minimalMedication as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/medications', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'child-test-123',
          medicationName: 'Simple Med',
          minIntervalHours: 6,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.medication.activeIngredient).toBeNull();
      expect(data.medication.maxDosesPerDay).toBeNull();
    });
  });
});
