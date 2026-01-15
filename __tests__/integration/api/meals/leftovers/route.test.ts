// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/meals/leftovers/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/meals/leftovers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return empty array when no leftovers exist', async () => {
    const session = mockParentSession();

    prismaMock.leftover.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leftovers).toEqual([]);
  });

  it('should return only active leftovers (not used or tossed)', async () => {
    const session = mockParentSession();

    const activeLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Lasagna',
      quantity: 'Half pan',
      storedAt: new Date('2026-01-01'),
      expiresAt: new Date('2026-01-04'),
      usedAt: null,
      tossedAt: null,
      notes: 'From dinner',
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.leftover.findMany.mockResolvedValue([activeLeftover] as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leftovers).toHaveLength(1);
    expect(data.leftovers[0].name).toBe('Lasagna');

    expect(prismaMock.leftover.findMany).toHaveBeenCalledWith({
      where: {
        familyId: session.user.familyId,
        usedAt: null,
        tossedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });
  });

  it('should only return leftovers from user family', async () => {
    const session = mockParentSession();

    prismaMock.leftover.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.leftover.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyId: session.user.familyId,
        }),
      })
    );
  });

  it('should allow children to view leftovers', async () => {
    const session = mockChildSession();

    prismaMock.leftover.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it('should order leftovers by expiration date (soonest first)', async () => {
    const session = mockParentSession();

    prismaMock.leftover.findMany.mockResolvedValue([]);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.leftover.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          expiresAt: 'asc',
        },
      })
    );
  });
});

describe('POST /api/meals/leftovers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pizza',
        quantity: '2 slices',
        daysUntilExpiry: 3,
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 400 if name is missing', async () => {
    const session = mockParentSession();

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity: '2 slices',
        daysUntilExpiry: 3,
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/name is required/i);
  });

  it('should create leftover with default expiration (3 days)', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Pizza',
      quantity: '2 slices',
      storedAt: now,
      expiresAt: new Date('2026-01-04T12:00:00Z'), // 3 days later
      usedAt: null,
      tossedAt: null,
      notes: null,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pizza',
        quantity: '2 slices',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.leftover.name).toBe('Pizza');

    // Verify expiration is 3 days from now
    expect(prismaMock.leftover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Pizza',
        quantity: '2 slices',
        familyId: session.user.familyId,
        createdBy: session.user.id,
        expiresAt: new Date('2026-01-04T12:00:00Z'),
      }),
    });

    jest.useRealTimers();
  });

  it('should create leftover with custom expiration days', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Soup',
      quantity: '1 bowl',
      storedAt: now,
      expiresAt: new Date('2026-01-06T12:00:00Z'), // 5 days later
      usedAt: null,
      tossedAt: null,
      notes: null,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Soup',
        quantity: '1 bowl',
        daysUntilExpiry: 5,
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);

    expect(prismaMock.leftover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: new Date('2026-01-06T12:00:00Z'),
      }),
    });

    jest.useRealTimers();
  });

  it('should create leftover with notes', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Pasta',
      quantity: null,
      storedAt: now,
      expiresAt: new Date('2026-01-04T12:00:00Z'),
      usedAt: null,
      tossedAt: null,
      notes: 'Contains garlic',
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pasta',
        notes: 'Contains garlic',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);

    expect(prismaMock.leftover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        notes: 'Contains garlic',
      }),
    });
  });

  it('should create audit log on leftover creation', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Chicken',
      quantity: null,
      storedAt: now,
      expiresAt: new Date('2026-01-04T12:00:00Z'),
      usedAt: null,
      tossedAt: null,
      notes: null,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Chicken',
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LEFTOVER_LOGGED',
          familyId: session.user.familyId,
          memberId: session.user.id,
        }),
      })
    );
  });

  it('should allow parents to create leftovers', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Rice',
      quantity: null,
      storedAt: now,
      expiresAt: new Date('2026-01-04T12:00:00Z'),
      usedAt: null,
      tossedAt: null,
      notes: null,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rice',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('should allow children to create leftovers', async () => {
    const session = mockChildSession();

    const now = new Date('2026-01-01T12:00:00Z');
    const mockLeftover = {
      id: 'leftover-1',
      familyId: session.user.familyId,
      name: 'Mac and cheese',
      quantity: null,
      storedAt: now,
      expiresAt: new Date('2026-01-04T12:00:00Z'),
      usedAt: null,
      tossedAt: null,
      notes: null,
      createdBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    };

    prismaMock.leftover.create.mockResolvedValue(mockLeftover as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Mac and cheese',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
  });
});
