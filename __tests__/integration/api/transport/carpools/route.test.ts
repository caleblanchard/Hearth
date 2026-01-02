// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/transport/carpools/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/transport/carpools', () => {
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

  const mockCarpool = {
    id: 'carpool-1',
    familyId: 'family-test-123',
    name: 'Soccer Carpool',
    createdAt: new Date(),
    updatedAt: new Date(),
    members: [
      {
        id: 'member-1',
        carpoolId: 'carpool-1',
        name: 'Sarah Johnson',
        phone: '555-1111',
        email: 'sarah@example.com',
      },
      {
        id: 'member-2',
        carpoolId: 'carpool-1',
        name: 'Mike Smith',
        phone: '555-2222',
        email: 'mike@example.com',
      },
    ],
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all carpools for family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.carpoolGroup.findMany.mockResolvedValue([mockCarpool] as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.carpools).toHaveLength(1);
      expect(data.carpools[0].name).toBe('Soccer Carpool');
      expect(data.carpools[0].members).toHaveLength(2);
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({ name: 'Soccer Carpool' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      mockAuth.mockResolvedValue(mockChildSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({ name: 'Soccer Carpool' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({ members: [] }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should create carpool without members', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const carpoolWithoutMembers = {
        id: 'carpool-1',
        familyId: 'family-test-123',
        name: 'Soccer Carpool',
        createdAt: new Date(),
        updatedAt: new Date(),
        members: [],
      };

      prismaMock.carpoolGroup.create.mockResolvedValue(carpoolWithoutMembers as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Soccer Carpool',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.carpool.name).toBe('Soccer Carpool');

      expect(prismaMock.carpoolGroup.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Soccer Carpool',
          members: {
            create: [],
          },
        },
        include: {
          members: true,
        },
      });
    });

    it('should create carpool with members', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.carpoolGroup.create.mockResolvedValue(mockCarpool as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Soccer Carpool',
          members: [
            { name: 'Sarah Johnson', phone: '555-1111', email: 'sarah@example.com' },
            { name: 'Mike Smith', phone: '555-2222', email: 'mike@example.com' },
          ],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.carpool.members).toHaveLength(2);

      expect(prismaMock.carpoolGroup.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Soccer Carpool',
          members: {
            create: [
              { name: 'Sarah Johnson', phone: '555-1111', email: 'sarah@example.com' },
              { name: 'Mike Smith', phone: '555-2222', email: 'mike@example.com' },
            ],
          },
        },
        include: {
          members: true,
        },
      });
    });

    it('should return 400 if member is missing name', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/transport/carpools', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Soccer Carpool',
          members: [
            { phone: '555-1111' }, // Missing name
          ],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
