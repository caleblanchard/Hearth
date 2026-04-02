import { NextRequest } from 'next/server';
import { GET } from '@/app/api/screentime/family/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { Role } from '@/lib/enums';

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
  getFamilyScreenTimeOverview: jest.fn(),
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

import { getFamilyScreenTimeOverview } from '@/lib/data/screentime';

describe('/api/screentime/family', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if not a parent', async () => {
    const session = mockChildSession();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Unauthorized - Parent access required');
  });

  it('should return family overview', async () => {
    const session = mockParentSession();
    
    const mockOverview = {
      members: [
        {
          id: 'child-1',
          name: 'Child One',
          avatarUrl: null,
          role: 'CHILD',
          currentBalance: 60,
          weeklyAllocation: 120,
          weeklyUsage: 50,
        },
        {
          id: 'child-2',
          name: 'Child Two',
          avatarUrl: null,
          role: 'CHILD',
          currentBalance: 45,
          weeklyAllocation: 100,
          weeklyUsage: 15,
        }
      ]
    };

    (getFamilyScreenTimeOverview as jest.Mock).mockResolvedValue(mockOverview);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview).toEqual(mockOverview);
    expect(getFamilyScreenTimeOverview).toHaveBeenCalledWith(session.user.familyId);
  });

  it('should return 500 on error', async () => {
    const session = mockParentSession();
    
    (getFamilyScreenTimeOverview as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to get overview');
  });
});