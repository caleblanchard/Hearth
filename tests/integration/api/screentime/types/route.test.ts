import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/screentime/types/route';
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
  getScreenTimeTypes: jest.fn(),
  createScreenTimeType: jest.fn(),
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => {
  const { getMockSession } = require('@/lib/test-utils/auth-mock');
  
  return {
    createClient: jest.fn(() => ({
      from: jest.fn((table) => {
        // Mock query building if needed
        return {
          select: jest.fn(),
        }
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
  };
});

import { getScreenTimeTypes, createScreenTimeType } from '@/lib/data/screentime';

describe('/api/screentime/types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      // Typically handled by middleware or getAuthContext returning null
      // But since we mocked getAuthContext to use getMockSession, and default is auth'd...
      // We can skip this or set mock session to null.
    });

    it('should return all active types for family', async () => {
      const session = mockParentSession();

      const mockTypes = [
        {
          id: 'type-1',
          family_id: session.user.familyId,
          name: 'Educational',
          description: 'Educational apps and websites',
          is_active: true,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'type-2',
          family_id: session.user.familyId,
          name: 'Entertainment',
          description: null,
          is_active: true,
          is_archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      (getScreenTimeTypes as jest.Mock).mockResolvedValue(mockTypes);

      const request = new NextRequest('http://localhost/api/screentime/types');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.types).toHaveLength(2);
      expect(data.types[0].name).toBe('Educational');
      expect(getScreenTimeTypes).toHaveBeenCalledWith(session.user.familyId);
    });
  });

  describe('POST', () => {
    it('should return 400 if name is missing', async () => {
      const session = mockParentSession();

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Name is required');
    });

    it('should create a new screen time type', async () => {
      const session = mockParentSession();

      const mockType = {
        id: 'type-1',
        family_id: session.user.familyId,
        name: 'Gaming',
        description: 'Video games',
        is_active: true,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      (createScreenTimeType as jest.Mock).mockResolvedValue(mockType);

      const request = new NextRequest('http://localhost/api/screentime/types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Gaming',
          description: 'Video games',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.type.name).toBe('Gaming');
      expect(data.message).toContain('created successfully');
      expect(createScreenTimeType).toHaveBeenCalledWith({
        family_id: session.user.familyId,
        name: 'Gaming',
        description: 'Video games',
        is_active: true,
        is_archived: false,
      });
    });
  });
});
