// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/screentime/types/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/screentime/types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all active types for family', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const mockTypes = [
        {
          id: 'type-1',
          familyId: session.user.familyId,
          name: 'Educational',
          description: 'Educational apps and websites',
          isActive: true,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'type-2',
          familyId: session.user.familyId,
          name: 'Entertainment',
          description: null,
          isActive: true,
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.screenTimeType.findMany.mockResolvedValue(mockTypes as any);

      const request = new NextRequest('http://localhost/api/screentime/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.types).toHaveLength(2);
      expect(data.types[0].name).toBe('Educational');
      expect(prismaMock.screenTimeType.findMany).toHaveBeenCalledWith({
        where: {
          familyId: session.user.familyId,
          isArchived: false,
        },
        orderBy: [
          { isActive: 'desc' },
          { name: 'asc' },
        ],
      });
    });

    it('should exclude archived types', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeType.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/screentime/types');
      await GET(request);

      expect(prismaMock.screenTimeType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: false,
          }),
        })
      );
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Gaming' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Gaming' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can create screen time types');
    });

    it('should return 400 if name is missing', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 if name is empty', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({ name: '   ' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 if type with same name already exists', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        id: 'existing-type',
        name: 'Gaming',
      } as any);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Gaming' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A screen time type with this name already exists');
    });

    it('should create a new screen time type', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);
      const mockType = {
        id: 'type-1',
        familyId: session.user.familyId,
        name: 'Gaming',
        description: 'Video games',
        isActive: true,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.screenTimeType.create.mockResolvedValue(mockType as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Gaming',
          description: 'Video games',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.type.name).toBe('Gaming');
      expect(data.message).toContain('created successfully');
      expect(prismaMock.screenTimeType.create).toHaveBeenCalledWith({
        data: {
          familyId: session.user.familyId,
          name: 'Gaming',
          description: 'Video games',
          isActive: true,
          isArchived: false,
        },
      });
      expect(prismaMock.auditLog.create).toHaveBeenCalled();
    });

    it('should trim name and description', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);
      prismaMock.screenTimeType.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Gaming  ',
          description: '  Video games  ',
        }),
      });

      await POST(request);

      expect(prismaMock.screenTimeType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Gaming',
          description: 'Video games',
        }),
      });
    });

    it('should set description to null if not provided', async () => {
      const session = mockParentSession();
      auth.mockResolvedValue(session);

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);
      prismaMock.screenTimeType.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Gaming' }),
      });

      await POST(request);

      expect(prismaMock.screenTimeType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      });
    });
  });
});
