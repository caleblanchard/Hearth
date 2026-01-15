// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transport/drivers/route';

describe('/api/transport/drivers', () => {
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

  const mockDriver = {
    id: 'driver-1',
    familyId: 'family-test-123',
    name: 'Mom',
    phone: '555-1234',
    relationship: 'Mom',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all drivers for family', async () => {
      prismaMock.transportDriver.findMany.mockResolvedValue([mockDriver] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.drivers).toHaveLength(1);
      expect(data.drivers[0].name).toBe('Mom');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Mom' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Mom' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'POST',
        body: JSON.stringify({ phone: '555-1234' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should create driver successfully', async () => {
      prismaMock.transportDriver.create.mockResolvedValue(mockDriver as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/drivers', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Mom',
          phone: '555-1234',
          relationship: 'Mom',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.driver.name).toBe('Mom');

      expect(prismaMock.transportDriver.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Mom',
          phone: '555-1234',
          relationship: 'Mom',
        },
      });
    });
  });
});
