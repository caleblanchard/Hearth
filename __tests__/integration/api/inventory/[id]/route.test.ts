// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/inventory/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/inventory/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockInventoryItem = {
    id: 'item-1',
    familyId: 'family-test-123',
    name: 'Milk',
    category: 'FOOD_FRIDGE',
    location: 'FRIDGE',
    currentQuantity: 2,
    unit: 'gallons',
    lowStockThreshold: 1,
    expiresAt: new Date('2026-01-10T00:00:00Z'),
    barcode: null,
    notes: null,
    lastRestockedAt: null,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    updatedAt: new Date('2026-01-01T12:00:00Z'),
  };

  describe('GET /api/inventory/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if item not found', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Inventory item not found');
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockInventoryItem,
        familyId: 'other-family',
      };
      prismaMock.inventoryItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return inventory item by id', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.item.id).toBe('item-1');
      expect(data.item.name).toBe('Milk');
      expect(data.item.currentQuantity).toBe(2);

      expect(prismaMock.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });
    });

    it('should allow children to view inventory items', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.item.id).toBe('item-1');
    });
  });

  describe('PATCH /api/inventory/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ currentQuantity: 3 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ currentQuantity: 3 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update inventory items');
    });

    it('should return 404 if item not found', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ currentQuantity: 3 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockInventoryItem,
        familyId: 'other-family',
      };
      prismaMock.inventoryItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ currentQuantity: 3 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(403);
    });

    it('should update inventory item fields', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const updatedItem = {
        ...mockInventoryItem,
        currentQuantity: 3,
        notes: 'Updated notes',
        updatedAt: now,
      };

      prismaMock.inventoryItem.update.mockResolvedValue(updatedItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({
          currentQuantity: 3,
          notes: 'Updated notes',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.item.currentQuantity).toBe(3);
      expect(data.item.notes).toBe('Updated notes');
      expect(data.message).toBe('Inventory item updated successfully');

      expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: {
          currentQuantity: 3,
          notes: 'Updated notes',
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'INVENTORY_ITEM_UPDATED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'Milk',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should return 400 if category is invalid', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({
          category: 'INVALID_CATEGORY',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });

    it('should return 400 if location is invalid', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({
          location: 'INVALID_LOCATION',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid location');
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);
      prismaMock.inventoryItem.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'PATCH',
        body: JSON.stringify({ currentQuantity: 3 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update inventory item');
    });
  });

  describe('DELETE /api/inventory/[id]', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can delete inventory items');
    });

    it('should return 404 if item not found', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if item belongs to different family', async () => {
      const otherFamilyItem = {
        ...mockInventoryItem,
        familyId: 'other-family',
      };
      prismaMock.inventoryItem.findUnique.mockResolvedValue(otherFamilyItem as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(403);
    });

    it('should delete inventory item successfully', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);
      prismaMock.inventoryItem.delete.mockResolvedValue(mockInventoryItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Inventory item deleted successfully');

      expect(prismaMock.inventoryItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'INVENTORY_ITEM_DELETED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'Milk',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.inventoryItem.findUnique.mockResolvedValue(mockInventoryItem as any);
      prismaMock.inventoryItem.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/inventory/item-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'item-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete inventory item');
    });
  });
});
