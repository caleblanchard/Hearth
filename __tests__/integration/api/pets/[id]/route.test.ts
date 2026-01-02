// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/pets/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/pets/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  const mockPet = {
    id: 'pet-1',
    familyId: 'family-test-123',
    name: 'Max',
    species: 'DOG',
    breed: 'Golden Retriever',
    birthday: new Date('2020-03-15'),
    imageUrl: 'https://example.com/max.jpg',
    notes: 'Loves to play fetch',
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
  };

  describe('GET /api/pets/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1');
      const response = await GET(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(401);
    });

    it('should return pet by id', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1');
      const response = await GET(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pet.name).toBe('Max');
      expect(data.pet.species).toBe('DOG');

      expect(prismaMock.pet.findUnique).toHaveBeenCalledWith({
        where: { id: 'pet-1' },
      });
    });

    it('should return 404 if pet not found', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Pet not found');
    });

    it('should return 403 if pet belongs to different family', async () => {
      const otherFamilyPet = {
        ...mockPet,
        familyId: 'other-family',
      };
      prismaMock.pet.findUnique.mockResolvedValue(otherFamilyPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1');
      const response = await GET(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should allow children to view pets', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1');
      const response = await GET(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pet.name).toBe('Max');
    });
  });

  describe('PATCH /api/pets/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update pets');
    });

    it('should return 404 if pet not found', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if pet belongs to different family', async () => {
      const otherFamilyPet = {
        ...mockPet,
        familyId: 'other-family',
      };
      prismaMock.pet.findUnique.mockResolvedValue(otherFamilyPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(403);
    });

    it('should update pet basic fields', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const updatedPet = {
        ...mockPet,
        name: 'Maximus',
        notes: 'Updated notes',
      };
      prismaMock.pet.update.mockResolvedValue(updatedPet as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Maximus',
          notes: 'Updated notes',
        }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pet.name).toBe('Maximus');
      expect(data.message).toBe('Pet updated successfully');

      expect(prismaMock.pet.update).toHaveBeenCalledWith({
        where: { id: 'pet-1' },
        data: {
          name: 'Maximus',
          notes: 'Updated notes',
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PET_UPDATED',
          result: 'SUCCESS',
          metadata: {
            petId: 'pet-1',
            name: 'Maximus',
          },
        },
      });
    });

    it('should validate species if provided', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({
          species: 'INVALID',
        }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid species');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);
      prismaMock.pet.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update pet');
    });
  });

  describe('DELETE /api/pets/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can delete pets');
    });

    it('should return 404 if pet not found', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'nonexistent' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if pet belongs to different family', async () => {
      const otherFamilyPet = {
        ...mockPet,
        familyId: 'other-family',
      };
      prismaMock.pet.findUnique.mockResolvedValue(otherFamilyPet as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(403);
    });

    it('should delete pet successfully', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);
      prismaMock.pet.delete.mockResolvedValue(mockPet as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Pet deleted successfully');

      expect(prismaMock.pet.delete).toHaveBeenCalledWith({
        where: { id: 'pet-1' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PET_DELETED',
          result: 'SUCCESS',
          metadata: {
            petId: 'pet-1',
            name: 'Max',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.pet.findUnique.mockResolvedValue(mockPet as any);
      prismaMock.pet.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pets/pet-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'pet-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete pet');
    });
  });
});
