// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/meals/leftovers/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('PATCH /api/meals/leftovers/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if leftover not found', async () => {
    const session = mockParentSession();

    dbMock.leftover.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if leftover belongs to different family', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: 'different-family-id',
      name: 'Pizza',
      expiresAt: new Date(),
      createdBy: 'other-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(403);
  });

  it('should return 400 if action is missing', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Pizza',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/action is required/i);
  });

  it('should return 400 if action is invalid', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Pizza',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/must be 'used' or 'tossed'/i);
  });

  it('should mark leftover as used', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Pizza',
      quantity: '2 slices',
      storedAt: new Date('2025-12-30'),
      expiresAt: new Date('2026-01-02'),
      usedAt: null,
      tossedAt: null,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedLeftover = {
      ...existingLeftover,
      usedAt: now,
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(updatedLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leftover.usedAt).toBeTruthy();

    expect(dbMock.leftover.update).toHaveBeenCalledWith({
      where: { id: 'leftover-123' },
      data: { usedAt: '2026-01-01T12:00:00.000Z' },
    });

    jest.useRealTimers();
  });

  it('should mark leftover as tossed', async () => {
    const session = mockParentSession();

    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Expired soup',
      usedAt: null,
      tossedAt: null,
    };

    const updatedLeftover = {
      ...existingLeftover,
      tossedAt: now,
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(updatedLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tossed' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.leftover.tossedAt).toBeTruthy();

    expect(dbMock.leftover.update).toHaveBeenCalledWith({
      where: { id: 'leftover-123' },
      data: { tossedAt: '2026-01-01T12:00:00.000Z' },
    });

    jest.useRealTimers();
  });

  it('should create audit log for marking as used', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Pizza',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(existingLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LEFTOVER_MARKED_USED',
          familyId: session.user.familyId,
          memberId: session.user.id,
        }),
      })
    );
  });

  it('should create audit log for marking as tossed', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Soup',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(existingLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tossed' }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(dbMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'LEFTOVER_MARKED_TOSSED',
        }),
      })
    );
  });

  it('should allow parents to mark leftovers as used', async () => {
    const session = mockParentSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Rice',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(existingLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(200);
  });

  it('should allow children to mark leftovers as used', async () => {
    const session = mockChildSession();

    const existingLeftover = {
      id: 'leftover-123',
      familyId: session.user.familyId,
      name: 'Pasta',
    };

    dbMock.leftover.findUnique.mockResolvedValue(existingLeftover as any);
    dbMock.leftover.update.mockResolvedValue(existingLeftover as any);
    dbMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/meals/leftovers/leftover-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'used' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'leftover-123' }) });

    expect(response.status).toBe(200);
  });
});
