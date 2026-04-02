import { NextRequest } from 'next/server';
import { POST } from '@/app/api/screentime/grace/request/route';
import { mockChildSession } from '@/lib/test-utils/auth-mock';

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
  requestGracePeriod: jest.fn(),
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
  };
});

import { requestGracePeriod } from '@/lib/data/screentime';

describe('POST /api/screentime/grace/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if allowanceId is missing', async () => {
    const session = mockChildSession();

    const request = new NextRequest('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ minutes: 15, reason: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Allowance ID is required');
  });

  it('should return 400 if minutes are missing', async () => {
    const session = mockChildSession();

    const request = new NextRequest('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ allowanceId: 'allowance-1', reason: 'Test' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Minutes are required');
  });

  it('should request grace period successfully', async () => {
    const session = mockChildSession();
    
    (requestGracePeriod as jest.Mock).mockResolvedValue({
      id: 'grace-1',
      minutesGranted: 15,
      status: 'PENDING'
    });

    const request = new NextRequest('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ 
        allowanceId: 'allowance-1', 
        minutes: 15, 
        reason: 'Test reason' 
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(requestGracePeriod).toHaveBeenCalledWith(
      'allowance-1',
      session.user.id,
      15,
      'Test reason'
    );
  });

  it('should handle errors', async () => {
    const session = mockChildSession();
    
    (requestGracePeriod as jest.Mock).mockRejectedValue(new Error('Limit reached'));

    const request = new NextRequest('http://localhost/api/screentime/grace/request', {
      method: 'POST',
      body: JSON.stringify({ 
        allowanceId: 'allowance-1', 
        minutes: 15 
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to request grace period');
  });
});