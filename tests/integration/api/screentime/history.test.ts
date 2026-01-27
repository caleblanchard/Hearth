import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/history/route';
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
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn(), // For await support
    };

    if (table === 'family_members') {
      mockQuery.single.mockResolvedValue({
        data: { id: 'child-1', family_id: 'family-test-123' }
      });
    } else if (table === 'screen_time_transactions') {
      // Handle count query vs data query
      mockQuery.select.mockImplementation((selectStr, options) => {
        if (options && options.count === 'exact') {
           return {
             eq: jest.fn().mockResolvedValue({ count: 10, data: null })
           };
        }
        return mockQuery; // Continue chain
      });

      mockQuery.then.mockImplementation((callback) => {
        // Resolve with data
        return Promise.resolve({
            data: [
                {
                    id: 'tx-1',
                    member_id: 'child-test-123',
                    amount_minutes: -30,
                    created_at: new Date().toISOString(),
                    createdBy: { id: 'child-test-123', name: 'Child' },
                    screenTimeType: { id: 'type-1', name: 'Game' }
                }
            ]
        }).then(callback);
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

describe('/api/screentime/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 403 if child tries to view another member history', async () => {
      const session = mockChildSession(); // role: CHILD

      // The route checks isParentInFamily(familyId)
      // Since mockChildSession has role CHILD, isParentInFamily returns false
      const request = new NextRequest('http://localhost/api/screentime/history?memberId=child-2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized - Parent access required');
    });

    it('should return history for current user (child)', async () => {
        const session = mockChildSession();

        const request = new NextRequest('http://localhost/api/screentime/history');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.transactions).toHaveLength(1);
        expect(data.pagination.total).toBe(10);
    });

    it('should allow parent to view child history', async () => {
        const session = mockParentSession();

        const request = new NextRequest('http://localhost/api/screentime/history?memberId=child-1');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        // Should query family_members to verify family ownership
        expect(mockSupabase.from).toHaveBeenCalledWith('family_members');
    });
  });
});