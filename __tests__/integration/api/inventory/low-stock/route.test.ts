// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/inventory/low-stock/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/inventory/low-stock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/inventory/low-stock');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return items where quantity <= threshold', async () => {
    const lowStockItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 1,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: new Date('2026-01-10T00:00:00Z'),
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
      {
        id: 'item-2',
        familyId: 'family-test-123',
        name: 'Toilet Paper',
        category: 'PAPER_GOODS',
        location: 'BATHROOM',
        currentQuantity: 0,
        unit: 'rolls',
        lowStockThreshold: 4,
        expiresAt: null,
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(lowStockItems as any);

    const request = new NextRequest('http://localhost:3000/api/inventory/low-stock');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(2);
    expect(data.items[0].name).toBe('Milk');
    expect(data.items[1].name).toBe('Toilet Paper');

    // Verify query filters for low stock (quantity <= threshold)
    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        lowStockThreshold: {
          not: null,
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('should return empty array when no low-stock items exist', async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/inventory/low-stock');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toEqual([]);
  });

  it('should allow children to view low-stock items', async () => {

    const lowStockItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 0,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: null,
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(lowStockItems as any);

    const request = new NextRequest('http://localhost:3000/api/inventory/low-stock');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.inventoryItem.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/inventory/low-stock');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch low-stock items');
  });
});
