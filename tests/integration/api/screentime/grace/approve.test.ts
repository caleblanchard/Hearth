import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screentime/grace/approve/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock data module
jest.mock('@/lib/data/screentime', () => ({
  approveGracePeriod: jest.fn(),
  rejectGracePeriod: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  const { getMockSession } = require('@/lib/test-utils/auth-mock');
  
  return {
    createClient: jest.fn(),
    getAuthContext: jest.fn(async () => {
      const session = getMockSession();
      if (!session) return null;
      return {
        user: session.user,
        activeFamilyId: session.user.familyId,
        activeMemberId: session.user.id,
      };
    }),
    isParentInFamily: jest.fn(async (familyId) => {
      const session = getMockSession();
      // Default parent session role is PARENT, child is CHILD
      return session?.user?.role === 'PARENT';
    }),
  };
});

import { approveGracePeriod, rejectGracePeriod } from '@/lib/data/screentime';

describe('POST /api/screentime/grace/approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if not a parent', async () => {
    const session = mockChildSession();

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only parents can approve grace requests');
  });

  it('should approve grace request', async () => {
    const session = mockParentSession();
    
    (approveGracePeriod as jest.Mock).mockResolvedValue({
      id: 'log-1',
      status: 'APPROVED'
    });

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Grace period approved');
    expect(approveGracePeriod).toHaveBeenCalledWith('log-1', session.user.id);
  });

  it('should reject grace request', async () => {
    const session = mockParentSession();
    
    (rejectGracePeriod as jest.Mock).mockResolvedValue({
      id: 'log-1',
      status: 'REJECTED'
    });

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: false }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Grace period rejected');
    expect(rejectGracePeriod).toHaveBeenCalledWith('log-1', session.user.id);
  });

  it('should handle errors', async () => {
    const session = mockParentSession();
    
    (approveGracePeriod as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/screentime/grace/approve', {
      method: 'POST',
      body: JSON.stringify({ graceLogId: 'log-1', approved: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to process grace request');
  });
});