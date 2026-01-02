// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/health/profile/[memberId]/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/health/profile/[memberId]', () => {
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

  const mockMedicalProfile = {
    id: 'profile-1',
    memberId: 'child-test-123',
    bloodType: 'A+',
    allergies: ['Peanuts', 'Penicillin'],
    conditions: ['Asthma'],
    medications: ['Albuterol'],
    weight: 45.5,
    weightUnit: 'lbs',
    updatedAt: new Date(),
    member: {
      id: 'child-test-123',
      name: 'Child',
      familyId: 'family-test-123',
    },
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(401);
    });

    it('should return medical profile for member', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.medicalProfile.findUnique.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');
      expect(data.profile.allergies).toEqual(['Peanuts', 'Penicillin']);
      expect(data.profile.weight).toBe(45.5);

      expect(prismaMock.medicalProfile.findUnique).toHaveBeenCalledWith({
        where: { memberId: 'child-test-123' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              familyId: true,
            },
          },
        },
      });
    });

    it('should return null if profile does not exist', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.medicalProfile.findUnique.mockResolvedValue(null);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile).toBeNull();
    });

    it('should return 404 if member not found', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.medicalProfile.findUnique.mockResolvedValue(null);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/non-existent', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'non-existent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 404 if member belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.medicalProfile.findUnique.mockResolvedValue({
        ...mockMedicalProfile,
        member: {
          ...mockMedicalProfile.member,
          familyId: 'other-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should allow children to view profiles', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);
      prismaMock.medicalProfile.findUnique.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');
    });
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to update profile', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update medical profiles');
    });

    it('should allow parents to update medical profile', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
          allergies: ['Peanuts', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          weight: 45.5,
          weightUnit: 'lbs',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');

      expect(prismaMock.medicalProfile.upsert).toHaveBeenCalledWith({
        where: { memberId: 'child-test-123' },
        create: {
          memberId: 'child-test-123',
          bloodType: 'A+',
          allergies: ['Peanuts', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          weight: 45.5,
          weightUnit: 'lbs',
        },
        update: {
          bloodType: 'A+',
          allergies: ['Peanuts', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          weight: 45.5,
          weightUnit: 'lbs',
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

    it('should create profile if it does not exist', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile).toBeTruthy();
    });

    it('should return 404 if member not found', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/non-existent', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'non-existent' } });

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

      const request = new NextRequest('http://localhost:3000/api/health/profile/other-family-child', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'other-family-child' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should accept partial updates', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          weight: 50.0,
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      expect(prismaMock.medicalProfile.upsert).toHaveBeenCalledWith({
        where: { memberId: 'child-test-123' },
        create: {
          memberId: 'child-test-123',
          weight: 50.0,
        },
        update: {
          weight: 50.0,
        },
        include: expect.any(Object),
      });
    });

    it('should accept empty arrays for allergies, conditions, and medications', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue({
        ...mockMedicalProfile,
        allergies: [],
        conditions: [],
        medications: [],
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          allergies: [],
          conditions: [],
          medications: [],
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.allergies).toEqual([]);
    });

    it('should return 400 if weight is negative', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          weight: -10,
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weight must be a positive number');
    });

    it('should return 400 if weightUnit is invalid', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          weight: 50,
          weightUnit: 'invalid',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weight unit must be either "lbs" or "kg"');
    });

    it('should accept both lbs and kg as weight units', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue(mockMedicalProfile as any);

      const validUnits = ['lbs', 'kg'];

      for (const unit of validUnits) {
        const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
          method: 'PATCH',
          body: JSON.stringify({
            weight: 50,
            weightUnit: unit,
          }),
        });
        const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

        expect(response.status).toBe(200);
      }
    });

    it('should log audit event on successful update', async () => {
      mockAuth.mockResolvedValue(mockParentSession as any);
      prismaMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      prismaMock.medicalProfile.upsert.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PATCH',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PATCH(request, { params: { memberId: 'child-test-123' } });

      expect(response.status).toBe(200);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MEDICAL_PROFILE_UPDATED',
          entityType: 'MedicalProfile',
          entityId: 'profile-1',
          result: 'SUCCESS',
        },
      });
    });
  });
});
