import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/allowances/[memberId]/route';
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

// Mock utils
jest.mock('@/lib/screentime-utils', () => ({
  calculateRemainingTime: jest.fn().mockResolvedValue(30),
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn((table) => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      upsert: jest.fn().mockReturnThis(),
    };

    if (table === 'family_members') {
      mockQuery.single.mockResolvedValue({
        data: { id: 'child-1', family_id: 'family-test-123', name: 'Child' }
      });
    } else if (table === 'screen_time_allowances') {
        mockQuery.select.mockReturnThis(); // chain
        // .eq('member_id', memberId).eq(...).eq(...)
        // The last chain call needs to resolve
        mockQuery.eq.mockImplementation((field, value) => {
            if (field === 'screen_time_type.is_archived') {
                return Promise.resolve({
                    data: [
                        {
                            id: 'allowance-1',
                            member_id: 'child-1',
                            screen_time_type_id: 'type-1',
                            allowance_minutes: 60,
                            screen_time_type: { id: 'type-1', name: 'Type 1', is_active: true }
                        }
                    ]
                });
            }
            return mockQuery;
        });
    }
    return mockQuery;
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

describe('/api/screentime/allowances/[memberId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 404 if member not found', async () => {
        const session = mockParentSession();

        // Override mock for this test
        mockSupabase.from.mockImplementationOnce((table) => {
            if (table === 'family_members') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null }),
                    upsert: jest.fn().mockReturnThis()
                };
            }
            return { select: jest.fn(), upsert: jest.fn(), eq: jest.fn().mockReturnThis(), single: jest.fn() };
        });

        const request = new NextRequest('http://localhost/api/screentime/allowances/child-999');
        const response = await GET(request, { params: Promise.resolve({ memberId: 'child-999' }) });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain('Member not found');
    });

    it('should return only allowances for active, non-archived types', async () => {
      const session = mockParentSession();

      const request = new NextRequest('http://localhost/api/screentime/allowances/child-1');
      const response = await GET(request, { params: Promise.resolve({ memberId: 'child-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.allowances).toHaveLength(1);
      expect(data.allowances[0].remaining).toBe(30);
      expect(data.allowances[0].screenTimeType.is_active).toBe(true);
      
      // Verify query constraints
      // Since we mocked the implementation to return data only on specific eq chain, implicit verification
    });
  });
});