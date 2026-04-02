import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/grace/pending/route';
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

// Mock Supabase
const mockSupabase = {
  from: jest.fn((table) => {
    if (table === 'grace_period_logs') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            is: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'log-1',
                      member_id: 'child-1',
                      minutes_granted: 15,
                      requested_at: new Date('2024-01-01T10:00:00Z').toISOString(),
                      reason: 'Test reason',
                      member: {
                        name: 'Child One',
                        family_id: 'family-test-123'
                      }
                    }
                  ]
                })
              }))
            }))
          }))
        }))
      };
    }
    if (table === 'screen_time_balances') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: {
                current_balance_minutes: 5
              }
            })
          }))
        }))
      };
    }
    return { select: jest.fn() };
  })
};

jest.mock('@/lib/supabase/server', () => {
  const { getMockSession } = require('@/lib/test-utils/auth-mock');
  
  return {
    createClient: jest.fn(() => mockSupabase),
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

describe('/api/screentime/grace/pending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if not a parent', async () => {
    const session = mockChildSession();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Only parents can view pending grace requests');
  });

  it('should return pending requests', async () => {
    const session = mockParentSession();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requests).toHaveLength(1);
    expect(data.requests[0]).toEqual({
      id: 'log-1',
      memberId: 'child-1',
      memberName: 'Child One',
      minutesGranted: 15,
      reason: 'Test reason',
      requestedAt: '2024-01-01T10:00:00.000Z',
      currentBalance: 5,
    });
  });

  it('should handle errors', async () => {
    const session = mockParentSession();
    
    // Override mock to throw
    mockSupabase.from.mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch pending grace requests');
  });
});