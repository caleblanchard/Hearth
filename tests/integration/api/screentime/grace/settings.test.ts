import { NextRequest } from 'next/server';
import { GET, PATCH } from '@/app/api/screentime/grace/settings/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { GraceRepaymentMode } from '@/lib/enums';

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
  getGraceSettings: jest.fn(),
  updateGraceSettings: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  const { getMockSession } = require('@/lib/test-utils/auth-mock');
  
  return {
    createClient: jest.fn(() => ({
      from: jest.fn((table) => {
        if (table === 'family_members') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      auth_user_id: 'child-1',
                      family_id: 'family-test-123',
                      role: 'CHILD'
                    }
                  })
                }))
              }))
            }))
          };
        }
        return { select: jest.fn() };
      }),
    })),
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

import { getGraceSettings, updateGraceSettings } from '@/lib/data/screentime';

describe('/api/screentime/grace/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSettings = {
    id: 'settings-1',
    family_id: 'family-test-123',
    max_daily_grace_periods: 3,
    require_reason: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Enums and other fields mapped by route
    grace_period_minutes: 15,
    max_grace_per_day: 3,
    max_grace_per_week: 10,
    grace_repayment_mode: 'DEDUCT_NEXT_WEEK',
    low_balance_warning_minutes: 10,
    requires_approval: false,
  };

  describe('GET', () => {
    it('should return settings for family', async () => {
      const session = mockParentSession();

      (getGraceSettings as jest.Mock).mockResolvedValue(mockSettings);

      const request = new NextRequest('http://localhost/api/screentime/grace/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Route maps snake_case to camelCase
      expect(data.settings.max_daily_grace_periods).toBe(3);
      expect(getGraceSettings).toHaveBeenCalledWith(session.user.familyId);
    });

    it('should return null if not configured', async () => {
      const session = mockParentSession();

      (getGraceSettings as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/screentime/grace/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.settings).toBeNull();
    });
  });

  describe('PATCH', () => {
    it('should return 403 if not parent', async () => {
      const session = mockChildSession();

      const request = new NextRequest('http://localhost/api/screentime/grace/settings', {
        method: 'PATCH',
        body: JSON.stringify({ max_daily_grace_periods: 5 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only parents can update grace settings');
    });

    it('should update settings', async () => {
      const session = mockParentSession();

      (updateGraceSettings as jest.Mock).mockResolvedValue({
        ...mockSettings,
        max_daily_grace_periods: 5,
      });

      const request = new NextRequest('http://localhost/api/screentime/grace/settings', {
        method: 'PATCH',
        body: JSON.stringify({ max_daily_grace_periods: 5 }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.settings.max_daily_grace_periods).toBe(5);
      expect(updateGraceSettings).toHaveBeenCalledWith(
        session.user.familyId,
        expect.objectContaining({ max_daily_grace_periods: 5 })
      );
    });
  });
});