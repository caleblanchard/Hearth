// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/guest/[code]/route';

describe('/api/auth/guest/[code]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockGuestInvite = {
    id: 'invite-1',
    familyId: 'family-test-123',
    invitedById: 'parent-test-123',
    guestName: 'Grandma',
    guestEmail: 'grandma@example.com',
    accessLevel: 'VIEW_ONLY',
    inviteCode: '123456',
    inviteToken: 'token-abc123',
    expiresAt: new Date('2026-01-10T00:00:00Z'),
    maxUses: 1,
    useCount: 0,
    status: 'PENDING',
    lastAccessedAt: null,
    createdAt: new Date('2026-01-01T12:00:00Z'),
    revokedAt: null,
  };

  it('should return 404 if invite code not found', async () => {
    prismaMock.guestInvite.findUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/guest/999999', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { code: '999999' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Invalid invite code');
  });

  it('should return 400 if invite is expired', async () => {
    const expiredInvite = {
      ...mockGuestInvite,
      expiresAt: new Date('2025-12-01T00:00:00Z'), // Expired
    };

    prismaMock.guestInvite.findUnique.mockResolvedValue(expiredInvite as any);

    const request = new NextRequest('http://localhost:3000/api/auth/guest/123456', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { code: '123456' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invite has expired');
  });

  it('should return 400 if invite is revoked', async () => {
    const revokedInvite = {
      ...mockGuestInvite,
      status: 'REVOKED',
      revokedAt: new Date('2025-12-15T00:00:00Z'),
    };

    prismaMock.guestInvite.findUnique.mockResolvedValue(revokedInvite as any);

    const request = new NextRequest('http://localhost:3000/api/auth/guest/123456', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { code: '123456' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invite has been revoked');
  });

  it('should return 400 if max uses exceeded', async () => {
    const maxedInvite = {
      ...mockGuestInvite,
      maxUses: 1,
      useCount: 1,
    };

    prismaMock.guestInvite.findUnique.mockResolvedValue(maxedInvite as any);

    const request = new NextRequest('http://localhost:3000/api/auth/guest/123456', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { code: '123456' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invite has reached maximum uses');
  });

  it('should create guest session successfully', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    jest.useFakeTimers();
    jest.setSystemTime(now);

    const sessionExpiresAt = new Date(mockGuestInvite.expiresAt);

    const mockSession = {
      id: 'session-1',
      guestInviteId: 'invite-1',
      sessionToken: 'session-token-xyz',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      startedAt: now,
      expiresAt: sessionExpiresAt,
      endedAt: null,
    };

    const updatedInvite = {
      ...mockGuestInvite,
      status: 'ACTIVE',
      useCount: 1,
      lastAccessedAt: now,
    };

    prismaMock.guestInvite.findUnique.mockResolvedValue(mockGuestInvite as any);
    prismaMock.guestSession.create.mockResolvedValue(mockSession as any);
    prismaMock.guestInvite.update.mockResolvedValue(updatedInvite as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/auth/guest/123456', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Mozilla/5.0',
      },
    });
    const response = await POST(request, { params: { code: '123456' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.session.sessionToken).toBe('session-token-xyz');
    expect(data.invite.guestName).toBe('Grandma');
    expect(data.invite.accessLevel).toBe('VIEW_ONLY');
    expect(data.message).toBe('Guest session started successfully');

    expect(prismaMock.guestSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        guestInviteId: 'invite-1',
        sessionToken: expect.any(String),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        expiresAt: mockGuestInvite.expiresAt,
      }),
    });

    expect(prismaMock.guestInvite.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: {
        status: 'ACTIVE',
        useCount: { increment: 1 },
        lastAccessedAt: now,
      },
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        familyId: 'family-test-123',
        memberId: null,
        action: 'GUEST_SESSION_STARTED',
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

  it('should handle database errors gracefully', async () => {
    prismaMock.guestInvite.findUnique.mockResolvedValue(mockGuestInvite as any);
    prismaMock.guestSession.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/auth/guest/123456', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request, { params: { code: '123456' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to start guest session');
  });
});
