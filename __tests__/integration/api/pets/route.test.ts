// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/pets/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/pets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  describe('GET /api/pets', () => {
    const mockPets = [
      {
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
      },
      {
        id: 'pet-2',
        familyId: 'family-test-123',
        name: 'Whiskers',
        species: 'CAT',
        breed: null,
        birthday: null,
        imageUrl: null,
        notes: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all pets for family', async () => {
      const mockPetsWithFeedings = mockPets.map(pet => ({
        ...pet,
        feedings: [],
      }));
      
      prismaMock.pet.findMany.mockResolvedValue(mockPetsWithFeedings as any);

      const request = new NextRequest('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pets).toHaveLength(2);
      expect(data.pets[0].name).toBe('Max');
      expect(data.pets[1].name).toBe('Whiskers');

      expect(prismaMock.pet.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
        },
        include: {
          feedings: {
            orderBy: {
              fedAt: 'desc',
            },
            take: 1,
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should return empty array when no pets exist', async () => {
      prismaMock.pet.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pets).toEqual([]);
    });

    it('should allow children to view pets', async () => {
      auth.mockResolvedValue(mockChildSession());
      
      const mockPetsWithFeedings = mockPets.map(pet => ({
        ...pet,
        feedings: [],
      }));
      
      prismaMock.pet.findMany.mockResolvedValue(mockPetsWithFeedings as any);

      const request = new NextRequest('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pets).toHaveLength(2);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.pet.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pets');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch pets');
    });
  });

  describe('POST /api/pets', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Max', species: 'DOG' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      auth.mockResolvedValue(mockChildSession());

      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Max', species: 'DOG' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can add pets');
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ species: 'DOG' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name and species are required');
    });

    it('should return 400 if species is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Max' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name and species are required');
    });

    it('should return 400 if species is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Max', species: 'INVALID' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid species');
    });

    it('should create pet with minimal data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockPet = {
        id: 'pet-1',
        familyId: 'family-test-123',
        name: 'Max',
        species: 'DOG',
        breed: null,
        birthday: null,
        imageUrl: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.pet.create.mockResolvedValue(mockPet as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Max',
          species: 'DOG',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.pet.name).toBe('Max');
      expect(data.pet.species).toBe('DOG');
      expect(data.message).toBe('Pet added successfully');

      expect(prismaMock.pet.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Max',
          species: 'DOG',
          breed: null,
          birthday: null,
          imageUrl: null,
          notes: null,
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PET_ADDED',
          result: 'SUCCESS',
          metadata: {
            petId: 'pet-1',
            name: 'Max',
            species: 'DOG',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should create pet with full data', async () => {
      const birthday = new Date('2020-03-15');
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockPet = {
        id: 'pet-1',
        familyId: 'family-test-123',
        name: 'Max',
        species: 'DOG',
        breed: 'Golden Retriever',
        birthday,
        imageUrl: 'https://example.com/max.jpg',
        notes: 'Loves to play fetch',
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.pet.create.mockResolvedValue(mockPet as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Max',
          species: 'DOG',
          breed: 'Golden Retriever',
          birthday: '2020-03-15',
          imageUrl: 'https://example.com/max.jpg',
          notes: 'Loves to play fetch',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.pet.name).toBe('Max');
      expect(data.pet.breed).toBe('Golden Retriever');

      expect(prismaMock.pet.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Max',
          species: 'DOG',
          breed: 'Golden Retriever',
          birthday: new Date('2020-03-15'),
          imageUrl: 'https://example.com/max.jpg',
          notes: 'Loves to play fetch',
        },
      });

      jest.useRealTimers();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.pet.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/pets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Max', species: 'DOG' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to add pet');
    });
  });
});
