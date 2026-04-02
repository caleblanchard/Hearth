// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/health/profile/[memberId]/route';

describe('/api/health/profile/[memberId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
    dbMock.familyMember.findFirst.mockResolvedValue({
      id: 'child-test-123',
      familyId: 'family-test-123',
    } as any);
    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'child-test-123',
      familyId: 'family-test-123',
    } as any);
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
      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(401);
    });

    it('should return medical profile for member', async () => {
      dbMock.medicalProfile.findUnique.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');
      expect(data.profile.allergies).toEqual(['Peanuts', 'Penicillin']);
      expect(data.profile.weight).toBe(45.5);

      expect(dbMock.medicalProfile.findFirst).toHaveBeenCalledWith({
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
      dbMock.medicalProfile.findUnique.mockResolvedValue(null);
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile).toBeNull();
    });

    it('should return 404 if member not found', async () => {
      dbMock.medicalProfile.findUnique.mockResolvedValue(null);
      dbMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/non-existent', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'non-existent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 404 if member belongs to different family', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'other-family-123',
      } as any);
      dbMock.medicalProfile.findUnique.mockResolvedValue({
        ...mockMedicalProfile,
        member: {
          ...mockMedicalProfile.member,
          familyId: 'other-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should allow children to view profiles', async () => {
      dbMock.medicalProfile.findUnique.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');
    });
  });

  describe('PUT', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if child tries to update profile', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update medical profiles');
    });

    it('should allow parents to update medical profile', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.create.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
          allergies: ['Peanuts', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          weight: 45.5,
          weightUnit: 'lbs',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.bloodType).toBe('A+');

      expect(dbMock.medicalProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          bloodType: 'A+',
          allergies: ['Peanuts', 'Penicillin'],
          conditions: ['Asthma'],
          medications: ['Albuterol'],
          weight: 45.5,
          weightUnit: 'lbs',
        },
      });
    });

    it('should create profile if it does not exist', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.create.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(dbMock.medicalProfile.create).toHaveBeenCalledWith({
        data: {
          memberId: 'child-test-123',
          bloodType: 'A+',
        },
      });
      expect(data.profile).toBeTruthy();
    });

    it('should return 404 if member not found', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/health/profile/non-existent', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'non-existent' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should return 404 if member belongs to different family', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'other-family-child',
        familyId: 'other-family-123',
        name: 'Other Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/other-family-child', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'other-family-child' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });

    it('should accept partial updates', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.create.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          weight: 50.0,
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      expect(dbMock.medicalProfile.update).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        data: {
          weight: 50.0,
        },
      });
    });

    it('should accept empty arrays for allergies, conditions, and medications', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue({
        ...mockMedicalProfile,
        allergies: [],
        conditions: [],
        medications: [],
      } as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          allergies: [],
          conditions: [],
          medications: [],
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.profile.allergies).toEqual([]);
    });

    it('should return 400 if weight is negative', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          weight: -10,
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weight must be a positive number');
    });

    it('should return 400 if weightUnit is invalid', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          weight: 50,
          weightUnit: 'invalid',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Weight unit must be either "lbs" or "kg"');
    });

    it('should accept both lbs and kg as weight units', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.create.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const validUnits = ['lbs', 'kg'];

      for (const unit of validUnits) {
        const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
          method: 'PUT',
          body: JSON.stringify({
            weight: 50,
            weightUnit: unit,
          }),
        });
        const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

        expect(response.status).toBe(200);
      }
    });

    it('should log audit event on successful update', async () => {
      dbMock.familyMember.findUnique.mockResolvedValue({
        id: 'child-test-123',
        familyId: 'family-test-123',
        name: 'Child',
      } as any);
      dbMock.medicalProfile.update.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.create.mockResolvedValue(mockMedicalProfile as any);
      dbMock.medicalProfile.findFirst.mockResolvedValue(mockMedicalProfile as any);

      const request = new NextRequest('http://localhost:3000/api/health/profile/child-test-123', {
        method: 'PUT',
        body: JSON.stringify({
          bloodType: 'A+',
        }),
      });
      const response = await PUT(request, { params: Promise.resolve({ memberId: 'child-test-123' }) });

      expect(response.status).toBe(200);
      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
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
