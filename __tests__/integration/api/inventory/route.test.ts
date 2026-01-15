// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/inventory/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/inventory', () => {
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

  describe('GET /api/inventory', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all inventory items for family', async () => {
      const mockItems = [
        mockInventoryItem,
        {
          ...mockInventoryItem,
          id: 'item-2',
          name: 'Bread',
          category: 'FOOD_PANTRY',
          location: 'PANTRY',
          currentQuantity: 3,
          unit: 'loaves',
          expiresAt: new Date('2026-01-05T00:00:00Z'),
        },
      ];

      prismaMock.inventoryItem.findMany.mockResolvedValue(mockItems as any);

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].name).toBe('Milk');
      expect(data.items[1].name).toBe('Bread');

      expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
        },
        orderBy: {
          name: 'asc',
        },
      });
    });

    it('should return empty array when no items exist', async () => {
      prismaMock.inventoryItem.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toEqual([]);
    });

    it('should allow children to view inventory items', async () => {
      prismaMock.inventoryItem.findMany.mockResolvedValue([mockInventoryItem] as any);

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toHaveLength(1);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.inventoryItem.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/inventory');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch inventory items');
    });
  });

  describe('POST /api/inventory', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          currentQuantity: 2,
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          currentQuantity: 2,
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can add inventory items');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          // Missing category, location, unit
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name, category, location, and unit are required');
    });

    it('should return 400 if category is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'INVALID_CATEGORY',
          location: 'FRIDGE',
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });

    it('should return 400 if location is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'INVALID_LOCATION',
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid location');
    });

    it('should create inventory item with minimal data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const minimalItem = {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 0,
        unit: 'gallons',
        lowStockThreshold: null,
        expiresAt: null,
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.inventoryItem.create.mockResolvedValue(minimalItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.item.name).toBe('Milk');
      expect(data.item.category).toBe('FOOD_FRIDGE');
      expect(data.item.location).toBe('FRIDGE');
      expect(data.item.currentQuantity).toBe(0);
      expect(data.message).toBe('Inventory item added successfully');

      expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          currentQuantity: 0,
          unit: 'gallons',
          lowStockThreshold: null,
          expiresAt: null,
          barcode: null,
          notes: null,
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'INVENTORY_ITEM_ADDED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'Milk',
            category: 'FOOD_FRIDGE',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should create inventory item with full data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const fullItem = {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 2,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: new Date('2026-01-10T00:00:00Z'),
        barcode: '123456789',
        notes: 'Organic whole milk',
        lastRestockedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.inventoryItem.create.mockResolvedValue(fullItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          currentQuantity: 2,
          unit: 'gallons',
          lowStockThreshold: 1,
          expiresAt: '2026-01-10T00:00:00Z',
          barcode: '123456789',
          notes: 'Organic whole milk',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.item.name).toBe('Milk');
      expect(data.item.currentQuantity).toBe(2);
      expect(data.item.lowStockThreshold).toBe(1);
      expect(data.item.barcode).toBe('123456789');
      expect(data.item.notes).toBe('Organic whole milk');

      expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          currentQuantity: 2,
          unit: 'gallons',
          lowStockThreshold: 1,
          expiresAt: new Date('2026-01-10T00:00:00Z'),
          barcode: '123456789',
          notes: 'Organic whole milk',
        },
      });

      jest.useRealTimers();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.inventoryItem.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Milk',
          category: 'FOOD_FRIDGE',
          location: 'FRIDGE',
          unit: 'gallons',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to add inventory item');
    });
  });
});
