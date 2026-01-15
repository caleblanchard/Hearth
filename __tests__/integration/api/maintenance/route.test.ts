// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/maintenance/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/maintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
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

  describe('GET /api/maintenance', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all maintenance items for family', async () => {
      const mockItems = [
        mockMaintenanceItem,
        {
          ...mockMaintenanceItem,
          id: 'item-2',
          name: 'Smoke Detector Batteries',
          category: 'SAFETY',
          frequency: 'Every 6 months',
          nextDueAt: new Date('2026-06-01T00:00:00Z'),
        },
      ];

      prismaMock.maintenanceItem.findMany.mockResolvedValue(mockItems as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toHaveLength(2);
      expect(data.items[0].name).toBe('HVAC Filter Replacement');
      expect(data.items[1].name).toBe('Smoke Detector Batteries');

      expect(prismaMock.maintenanceItem.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
        },
        orderBy: {
          nextDueAt: 'asc',
        },
      });
    });

    it('should return empty array when no items exist', async () => {
      prismaMock.maintenanceItem.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toEqual([]);
    });

    it('should allow children to view maintenance items', async () => {
      prismaMock.maintenanceItem.findMany.mockResolvedValue([mockMaintenanceItem] as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.items).toHaveLength(1);
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.maintenanceItem.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch maintenance items');
    });
  });

  describe('POST /api/maintenance', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter',
          category: 'HVAC',
          frequency: 'Every 3 months',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not a parent', async () => {

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter',
          category: 'HVAC',
          frequency: 'Every 3 months',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can add maintenance items');
    });

    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter',
          // Missing category and frequency
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name, category, and frequency are required');
    });

    it('should return 400 if category is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter',
          category: 'INVALID_CATEGORY',
          frequency: 'Every 3 months',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid category');
    });

    it('should return 400 if season is invalid', async () => {
      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Sprinkler Check',
          category: 'SEASONAL',
          frequency: 'Annual',
          season: 'INVALID_SEASON',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid season');
    });

    it('should create maintenance item with minimal data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const minimalItem = {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'HVAC Filter Replacement',
        description: null,
        category: 'HVAC',
        frequency: 'Every 3 months',
        season: null,
        lastCompletedAt: null,
        nextDueAt: null,
        estimatedCost: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.maintenanceItem.create.mockResolvedValue(minimalItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter Replacement',
          category: 'HVAC',
          frequency: 'Every 3 months',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.item.name).toBe('HVAC Filter Replacement');
      expect(data.item.category).toBe('HVAC');
      expect(data.message).toBe('Maintenance item created successfully');

      expect(prismaMock.maintenanceItem.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'HVAC Filter Replacement',
          description: null,
          category: 'HVAC',
          frequency: 'Every 3 months',
          season: null,
          nextDueAt: null,
          estimatedCost: null,
          notes: null,
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'MAINTENANCE_ITEM_CREATED',
          result: 'SUCCESS',
          metadata: {
            itemId: 'item-1',
            name: 'HVAC Filter Replacement',
            category: 'HVAC',
          },
        },
      });

      jest.useRealTimers();
    });

    it('should create maintenance item with full data', async () => {
      const now = new Date('2026-01-01T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const fullItem = {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'Sprinkler System Check',
        description: 'Inspect and test sprinkler system',
        category: 'SEASONAL',
        frequency: 'Annual',
        season: 'SPRING',
        lastCompletedAt: null,
        nextDueAt: new Date('2026-04-01T00:00:00Z'),
        estimatedCost: 150.0,
        notes: 'Call Joe at 555-1234',
        createdAt: now,
        updatedAt: now,
      };

      prismaMock.maintenanceItem.create.mockResolvedValue(fullItem as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Sprinkler System Check',
          description: 'Inspect and test sprinkler system',
          category: 'SEASONAL',
          frequency: 'Annual',
          season: 'SPRING',
          nextDueAt: '2026-04-01T00:00:00Z',
          estimatedCost: 150.0,
          notes: 'Call Joe at 555-1234',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.item.name).toBe('Sprinkler System Check');
      expect(data.item.season).toBe('SPRING');
      expect(data.item.estimatedCost).toBe(150.0);

      jest.useRealTimers();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.maintenanceItem.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          name: 'HVAC Filter',
          category: 'HVAC',
          frequency: 'Every 3 months',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create maintenance item');
    });
  });
});
