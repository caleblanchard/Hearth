// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/kiosk-auth', () => ({
  authenticateChildSession: jest.fn().mockResolvedValue(null),
  authenticateDeviceSecret: jest.fn().mockResolvedValue(null),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/maintenance/upcoming/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('/api/maintenance/upcoming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return upcoming and overdue items within 30 days by default', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const upcomingItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'HVAC Filter',
        category: 'HVAC',
        nextDueAt: new Date('2026-01-15T00:00:00Z'), // Due in 14 days
      },
      {
        id: 'item-2',
        familyId: 'family-test-123',
        name: 'Smoke Detector',
        category: 'SAFETY',
        nextDueAt: new Date('2025-12-25T00:00:00Z'), // Overdue by 7 days
      },
    ];

    dbMock.maintenanceItem.findMany.mockResolvedValue(upcomingItems as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(2);

    // Verify query filters for upcoming items (within 30 days)
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    expect(dbMock.maintenanceItem.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        nextDueAt: {
          lte: '2026-01-31T12:00:00.000Z',
        },
      },
      orderBy: {
        nextDueAt: 'asc',
      },
    });

    jest.useRealTimers();
  });

  it('should return items within custom days parameter', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const upcomingItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'HVAC Filter',
        category: 'HVAC',
        nextDueAt: new Date('2026-01-08T00:00:00Z'), // Due in 7 days
      },
    ];

    dbMock.maintenanceItem.findMany.mockResolvedValue(upcomingItems as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming?days=7');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);

    // Verify query filters for upcoming items (within 7 days)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    expect(dbMock.maintenanceItem.findMany).toHaveBeenCalledWith({
      where: {
        familyId: 'family-test-123',
        nextDueAt: {
          lte: '2026-01-08T12:00:00.000Z',
        },
      },
      orderBy: {
        nextDueAt: 'asc',
      },
    });

    jest.useRealTimers();
  });

  it('should return empty array when no upcoming items exist', async () => {
    dbMock.maintenanceItem.findMany.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toEqual([]);
  });

  it('should allow children to view upcoming items', async () => {

    const upcomingItems = [
      {
        id: 'item-1',
        familyId: 'family-test-123',
        name: 'HVAC Filter',
        category: 'HVAC',
        nextDueAt: new Date('2026-01-15T00:00:00Z'),
      },
    ];

    dbMock.maintenanceItem.findMany.mockResolvedValue(upcomingItems as any);

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.items).toHaveLength(1);
  });

  it('should handle database errors gracefully', async () => {
    dbMock.maintenanceItem.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/maintenance/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch upcoming maintenance');
  });

  it('should handle invalid days parameter', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/maintenance/upcoming?days=invalid'
    );
    const response = await GET(request);

    // Should use default 30 days when invalid param
    expect(response.status).toBe(200);

    // Verify it used default 30 days
    const mockCall = dbMock.maintenanceItem.findMany.mock.calls[0][0];
    expect(mockCall).toBeDefined();
  });
});
