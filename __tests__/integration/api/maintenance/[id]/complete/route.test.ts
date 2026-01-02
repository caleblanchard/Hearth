// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/maintenance/[id]/complete/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/maintenance/[id]/complete', () => {
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

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if item not found', async () => {
    prismaMock.maintenanceItem.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

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

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Access denied');
  });

  it('should log completion with minimal data', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

    const mockCompletion = {
      id: 'completion-1',
      maintenanceItemId: 'item-1',
      completedAt: now,
      completedBy: 'parent-test-123',
      cost: null,
      serviceProvider: null,
      notes: null,
      photoUrls: [],
    };

    const updatedItem = {
      ...mockMaintenanceItem,
      lastCompletedAt: now,
      nextDueAt: null, // Will be calculated based on frequency
    };

    prismaMock.maintenanceCompletion.create.mockResolvedValue(mockCompletion as any);
    prismaMock.maintenanceItem.update.mockResolvedValue(updatedItem as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.completion.completedBy).toBe('parent-test-123');
    expect(data.message).toBe('Maintenance task completed successfully');

    expect(prismaMock.maintenanceCompletion.create).toHaveBeenCalledWith({
      data: {
        maintenanceItemId: 'item-1',
        completedBy: 'parent-test-123',
        completedAt: now,
        cost: null,
        serviceProvider: null,
        notes: null,
        photoUrls: [],
      },
    });

    expect(prismaMock.maintenanceItem.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: {
        lastCompletedAt: now,
      },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        familyId: 'family-test-123',
        memberId: 'parent-test-123',
        action: 'MAINTENANCE_TASK_COMPLETED',
        result: 'SUCCESS',
        metadata: {
          itemId: 'item-1',
          itemName: 'HVAC Filter Replacement',
          completedBy: 'parent-test-123',
        },
      },
    });

    jest.useRealTimers();
  });

  it('should log completion with full data', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

    const mockCompletion = {
      id: 'completion-1',
      maintenanceItemId: 'item-1',
      completedAt: now,
      completedBy: 'parent-test-123',
      cost: 30.0,
      serviceProvider: 'HVAC Pro',
      notes: 'Filter was very dirty, recommended more frequent changes',
      photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    };

    const updatedItem = {
      ...mockMaintenanceItem,
      lastCompletedAt: now,
    };

    prismaMock.maintenanceCompletion.create.mockResolvedValue(mockCompletion as any);
    prismaMock.maintenanceItem.update.mockResolvedValue(updatedItem as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({
        cost: 30.0,
        serviceProvider: 'HVAC Pro',
        notes: 'Filter was very dirty, recommended more frequent changes',
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      }),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.completion.cost).toBe(30.0);
    expect(data.completion.serviceProvider).toBe('HVAC Pro');
    expect(data.completion.photoUrls).toHaveLength(2);

    jest.useRealTimers();
  });

  it('should allow children to log completions', async () => {
    auth.mockResolvedValue(mockChildSession());
    prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);

    const mockCompletion = {
      id: 'completion-1',
      maintenanceItemId: 'item-1',
      completedAt: new Date(),
      completedBy: 'child-test-123',
      cost: null,
      serviceProvider: null,
      notes: null,
      photoUrls: [],
    };

    prismaMock.maintenanceCompletion.create.mockResolvedValue(mockCompletion as any);
    prismaMock.maintenanceItem.update.mockResolvedValue(mockMaintenanceItem as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(201);
    expect(prismaMock.maintenanceCompletion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completedBy: 'child-test-123',
        }),
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.maintenanceItem.findUnique.mockResolvedValue(mockMaintenanceItem as any);
    prismaMock.maintenanceCompletion.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/maintenance/item-1/complete', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { id: 'item-1' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to log maintenance completion');
  });
});
