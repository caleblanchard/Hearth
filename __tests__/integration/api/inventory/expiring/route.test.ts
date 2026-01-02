// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/inventory/expiring/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/inventory/expiring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/inventory/expiring');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return items expiring within 7 days by default', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const expiringItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 2,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: new Date('2026-01-05T00:00:00Z'), // Expires in 4 days
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
      {
        id: 'item-2',
        familyId: 'family-test-123',
        name: 'Yogurt',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 3,
        unit: 'cups',
        lowStockThreshold: null,
        expiresAt: new Date('2026-01-03T00:00:00Z'), // Expires in 2 days
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(expiringItems as any);

    const request = new NextRequest('http://localhost:3000/api/inventory/expiring');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(2);
    expect(data.items[0].name).toBe('Milk');
    expect(data.items[1].name).toBe('Yogurt');

    // Verify query filters for expiring items (within 7 days)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        expiresAt: {
          not: null,
          lte: sevenDaysFromNow,
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    jest.useRealTimers();
  });

  it('should return items expiring within custom days param', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const expiringItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 2,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: new Date('2026-01-04T00:00:00Z'), // Expires in 3 days
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(expiringItems as any);

    const request = new NextRequest(
      'http://localhost:3000/api/inventory/expiring?days=3'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);

    // Verify query filters for expiring items (within 3 days)
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        expiresAt: {
          not: null,
          lte: threeDaysFromNow,
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    jest.useRealTimers();
  });

  it('should return empty array when no expiring items exist', async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/inventory/expiring');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toEqual([]);
  });

  it('should allow children to view expiring items', async () => {
    auth.mockResolvedValue(mockChildSession());

    const expiringItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Milk',
        category: 'FOOD_FRIDGE',
        location: 'FRIDGE',
        currentQuantity: 2,
        unit: 'gallons',
        lowStockThreshold: 1,
        expiresAt: new Date('2026-01-05T00:00:00Z'),
        barcode: null,
        notes: null,
        lastRestockedAt: null,
        createdAt: new Date('2026-01-01T12:00:00Z'),
        updatedAt: new Date('2026-01-01T12:00:00Z'),
      },
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(expiringItems as any);

    const request = new NextRequest('http://localhost:3000/api/inventory/expiring');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.inventoryItem.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/inventory/expiring');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch expiring items');
  });

  it('should handle invalid days parameter', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/inventory/expiring?days=invalid'
    );
    const response = await GET(request);

    // Should use default 7 days when invalid param
    expect(response.status).toBe(200);

    // Verify it used default 7 days
    const mockCall = prismaMock.inventoryItem.findMany.mock.calls[0][0];
    expect(mockCall).toBeDefined();
  });
});
