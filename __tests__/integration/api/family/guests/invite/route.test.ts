// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/family/guests/invite/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('/api/family/guests/invite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
    auth.mockResolvedValue(mockParentSession());
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'VIEW_ONLY',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not a parent', async () => {
    auth.mockResolvedValue(mockChildSession());

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'VIEW_ONLY',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Only parents can create guest invites');
  });

  it('should return 400 if required fields are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        // Missing accessLevel and durationHours
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Guest name, access level, and duration are required');
  });

  it('should return 400 if access level is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'INVALID_LEVEL',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Invalid access level');
  });

  it('should create guest invite with minimal data', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 24);

    const mockInvite = {
      id: 'invite-1',
      familyId: 'family-test-123',
      invitedById: 'parent-test-123',
      guestName: 'Grandma',
      guestEmail: null,
      accessLevel: 'VIEW_ONLY',
      inviteCode: '123456',
      inviteToken: 'token-abc123',
      expiresAt,
      maxUses: 1,
      useCount: 0,
      status: 'PENDING',
      lastAccessedAt: null,
      createdAt: now,
      revokedAt: null,
    };

    prismaMock.guestInvite.create.mockResolvedValue(mockInvite as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'VIEW_ONLY',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.invite.guestName).toBe('Grandma');
    expect(data.invite.accessLevel).toBe('VIEW_ONLY');
    expect(data.invite.inviteCode).toBeDefined();
    expect(data.message).toBe('Guest invite created successfully');

    expect(prismaMock.guestInvite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        familyId: 'family-test-123',
        invitedById: 'parent-test-123',
        guestName: 'Grandma',
        guestEmail: null,
        accessLevel: 'VIEW_ONLY',
        inviteCode: expect.any(String),
        inviteToken: expect.any(String),
        expiresAt: expect.any(Date),
        maxUses: 1,
      }),
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        familyId: 'family-test-123',
        memberId: 'parent-test-123',
        action: 'GUEST_INVITE_CREATED',
        result: 'SUCCESS',
        metadata: {
          inviteId: 'invite-1',
          guestName: 'Grandma',
          accessLevel: 'VIEW_ONLY',
        },
      },
    });

    jest.useRealTimers();
  });

  it('should create guest invite with full data', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const expiresAt = new Date(now);
    expiresAt.setHours(expiresAt.getHours() + 168); // 1 week

    const mockInvite = {
      id: 'invite-1',
      familyId: 'family-test-123',
      invitedById: 'parent-test-123',
      guestName: 'Babysitter Jane',
      guestEmail: 'jane@example.com',
      accessLevel: 'CAREGIVER',
      inviteCode: '456789',
      inviteToken: 'token-def456',
      expiresAt,
      maxUses: 5,
      useCount: 0,
      status: 'PENDING',
      lastAccessedAt: null,
      createdAt: now,
      revokedAt: null,
    };

    prismaMock.guestInvite.create.mockResolvedValue(mockInvite as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Babysitter Jane',
        guestEmail: 'jane@example.com',
        accessLevel: 'CAREGIVER',
        durationHours: 168,
        maxUses: 5,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.invite.guestEmail).toBe('jane@example.com');
    expect(data.invite.accessLevel).toBe('CAREGIVER');
    expect(data.invite.maxUses).toBe(5);

    jest.useRealTimers();
  });

  it('should generate unique 6-digit invite code', async () => {
    const mockInvite = {
      id: 'invite-1',
      familyId: 'family-test-123',
      invitedById: 'parent-test-123',
      guestName: 'Grandma',
      guestEmail: null,
      accessLevel: 'VIEW_ONLY',
      inviteCode: '123456',
      inviteToken: 'token-abc123',
      expiresAt: new Date(),
      maxUses: 1,
      useCount: 0,
      status: 'PENDING',
      lastAccessedAt: null,
      createdAt: new Date(),
      revokedAt: null,
    };

    prismaMock.guestInvite.create.mockResolvedValue(mockInvite as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'VIEW_ONLY',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();

    // Verify invite code is 6 digits
    expect(data.invite.inviteCode).toMatch(/^\d{6}$/);
  });

  it('should handle database errors gracefully', async () => {
    prismaMock.guestInvite.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/family/guests/invite', {
      method: 'POST',
      body: JSON.stringify({
        guestName: 'Grandma',
        accessLevel: 'VIEW_ONLY',
        durationHours: 24,
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to create guest invite');
  });
});
