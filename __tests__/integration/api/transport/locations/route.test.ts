// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transport/locations/route';

describe('/api/transport/locations', () => {
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

  const mockChildSession = {
    user: {
      id: 'child-test-123',
      familyId: 'family-test-123',
      role: 'CHILD' as const,
    },
  };

  const mockLocation = {
    id: 'location-1',
    familyId: 'family-test-123',
    name: 'Elementary School',
    address: '123 School St',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all locations for family', async () => {
      prismaMock.transportLocation.findMany.mockResolvedValue([mockLocation] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.locations).toHaveLength(1);
      expect(data.locations[0].name).toBe('Elementary School');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'School', address: '123 Main St' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'POST',
        body: JSON.stringify({ name: 'School' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'POST',
        body: JSON.stringify({ address: '123 Main St' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should create location successfully', async () => {
      prismaMock.transportLocation.create.mockResolvedValue(mockLocation as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Elementary School',
          address: '123 School St',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.location.name).toBe('Elementary School');

      expect(prismaMock.transportLocation.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Elementary School',
          address: '123 School St',
        },
      });
    });
  });
});
