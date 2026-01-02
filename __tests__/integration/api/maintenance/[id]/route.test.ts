// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/maintenance/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/maintenance/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  const mockMaintenanceItem = {
    id: 'item-1',
    familyId: 'family-test-123',
    name: 'HVAC Filter Replacement',
    description: 'Replace air filter in HVAC system',
    category: 'HVAC',
    frequency: 'Every 3 months',
    season: null,
    lastCompletedAt: null,
    nextDueAt: new Date('2026-03-01T00:00:00Z'),
    estimatedCost: 25.0,
    notes: null,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
  };

  describe('GET /api/maintenance/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1');
      const response = await GET(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if item not found', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1');
      const response = await GET(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Maintenance item not found');
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockMaintenanceItem,
        familyId: 'other-family',
      };
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1');
      const response = await GET(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return maintenance item with completions', async () => {
      const itemWithCompletions = {
        ...mockMaintenanceItem,
        completions: [
          {
            id: 'completion-1',
            completedAt: new Date('2025-12-01T00:00:00Z'),
            completedBy: 'parent-test-123',
            cost: 25.0,
            serviceProvider: null,
            notes: 'Changed filter',
            member: {
              id: 'parent-test-123',
              name: 'Test Parent',
            },
          },
        ],
      };

      prismaMock.maintenanceItem.findUnique.mockResolvedValue(itemWithCompletions as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1');
      const response = await GET(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.item.id).toBe('item-1');
      expect(data.item.name).toBe('HVAC Filter Replacement');
      expect(data.item.completions).toHaveLength(1);

      expect(prismaMock.maintenanceItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        include: {
          completions: {
            include: {
              member: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              completedAt: 'desc',
            },
            take: 10,
          },
        },
      });
    });

    it('should allow children to view maintenance items', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.maintenanceItem.findUnique.mockResolvedValue({
        ...mockMaintenanceItem,
        completions: [],
      } as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1');
      const response = await GET(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/maintenance/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update maintenance items');
    });

    it('should return 404 if item not found', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockMaintenanceItem,
        familyId: 'other-family',
      };
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(403);
    });

    it('should update maintenance item fields', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

      const updatedItem = {
        ...mockMaintenanceItem,
        name: 'Updated HVAC Filter',
        nextDueAt: new Date('2026-04-01T00:00:00Z'),
        updatedAt: now,
      };

      prismaMock.maintenanceItem.update.mockResolvedValue(updatedItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated HVAC Filter',
          nextDueAt: '2026-04-01T00:00:00Z',
        }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.item.name).toBe('Updated HVAC Filter');
      expect(data.message).toBe('Maintenance item updated successfully');

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MAINTENANCE_ITEM_UPDATED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'Updated HVAC Filter',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should return 400 if category is invalid', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({
          category: 'INVALID_CATEGORY',
        }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);
      prismaMock.maintenanceItem.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      });
      const response = await PATCH(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update maintenance item');
    });
  });

  describe('DELETE /api/maintenance/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {
      auth.mockResolvedValue(mockChildSession());
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can delete maintenance items');
    });

    it('should return 404 if item not found', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockMaintenanceItem,
        familyId: 'other-family',
      };
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(403);
    });

    it('should delete maintenance item successfully', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);
      prismaMock.maintenanceItem.delete.mockResolvedValue(mockMaintenanceItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Maintenance item deleted successfully');

      expect(prismaMock.maintenanceItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MAINTENANCE_ITEM_DELETED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'HVAC Filter Replacement',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);
      prismaMock.maintenanceItem.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/maintenance/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { id: 'item-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete maintenance item');
    });
  });
});
