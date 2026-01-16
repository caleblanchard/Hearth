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
import { GET, PATCH, DELETE } from '@/app/api/screentime/types/[id]/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';

describe('/api/screentime/types/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockType = {
    id: 'type-1',
    familyId: 'family-1',
    name: 'Educational',
    description: 'Educational content',
    isActive: true,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/screentime/types/type-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if type not found', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Screen time type not found');
    });

    it('should return type with counts', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        ...mockType,
        _count: {
          transactions: 5,
          allowances: 2,
        },
      } as any);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type.name).toBe('Educational');
      expect(data.type._count.transactions).toBe(5);
      expect(data.type._count.allowances).toBe(2);
    });
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can update screen time types');
    });

    it('should return 404 if type not found', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Screen time type not found');
    });

    it('should update type name', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue(mockType as any);
      prismaMock.screenTimeType.update.mockResolvedValue({
        ...mockType,
        name: 'Updated Name',
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type.name).toBe('Updated Name');
      expect(prismaMock.screenTimeType.update).toHaveBeenCalledWith({
        where: { id: 'type-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should check for duplicate names when updating', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst
        .mockResolvedValueOnce(mockType as any) // First call: find the type to update
        .mockResolvedValueOnce({ id: 'other-type', name: 'Existing' } as any); // Second call: check for duplicate

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Existing' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('A screen time type with this name already exists');
    });

    it('should update isActive status', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue(mockType as any);
      prismaMock.screenTimeType.update.mockResolvedValue({
        ...mockType,
        isActive: false,
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type.isActive).toBe(false);
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not a parent', async () => {
      const session = mockChildSession();

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can archive screen time types');
    });

    it('should archive type if it has transactions', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        ...mockType,
        _count: {
          transactions: 5,
          allowances: 2,
        },
      } as any);

      prismaMock.screenTimeType.update.mockResolvedValue({
        ...mockType,
        isArchived: true,
        isActive: false,
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type.isArchived).toBe(true);
      expect(data.type.isActive).toBe(false);
      expect(data.message).toContain('archived');
      expect(prismaMock.screenTimeType.update).toHaveBeenCalledWith({
        where: { id: 'type-1' },
        data: {
          isArchived: true,
          isActive: false,
        },
      });
    });

    it('should delete type if it has no transactions', async () => {
      const session = mockParentSession();

      prismaMock.screenTimeType.findFirst.mockResolvedValue({
        ...mockType,
        _count: {
          transactions: 0,
          allowances: 0,
        },
      } as any);

      prismaMock.screenTimeType.delete.mockResolvedValue(mockType as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost/api/screentime/types/type-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'type-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('deleted successfully');
      expect(prismaMock.screenTimeType.delete).toHaveBeenCalledWith({
        where: { id: 'type-1' },
      });
    });
  });
});
