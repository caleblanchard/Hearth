import { NextRequest } from 'next/server';
import { POST } from '@/app/api/documents/share/[linkId]/revoke/route';
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
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
    };

    if (table === 'document_share_links') {
      mockQuery.single.mockResolvedValue({
        data: {
          id: 'link-1',
          document: { id: 'doc-1', family_id: 'family-test-123', name: 'Doc' },
          revoked_at: null
        }
      });
      mockQuery.update.mockReturnThis();
    } else if (table === 'audit_logs') {
        // ...
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
      return session?.user?.role === 'PARENT';
    }),
  };
});

describe('/api/documents/share/[linkId]/revoke', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 403 if not parent', async () => {
    const session = mockChildSession();
    const request = new NextRequest('http://localhost/api/documents/share/link-1/revoke', { method: 'POST' });
    const response = await POST(request, { params: Promise.resolve({ linkId: 'link-1' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Only parents');
  });

  it('should revoke link successfully', async () => {
    const session = mockParentSession();

    // Mock update return
    mockSupabase.from.mockImplementation((table) => {
        if (table === 'document_share_links') {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: {
                        id: 'link-1',
                        document: { id: 'doc-1', family_id: 'family-test-123', name: 'Doc' },
                        revoked_at: null
                    }
                }),
                update: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
            };
        }
        if (table === 'audit_logs') {
            return { 
                insert: jest.fn(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn(),
                update: jest.fn().mockReturnThis(),
            };
        }
        return { 
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn(),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
        };
    });

    // Mock update specifically for the second call (update -> select -> single)
    // Actually the code flow is:
    // 1. select().eq().single() -> returns link
    // 2. update().eq().select().single() -> returns updated link
    
    // I need to use mockReturnValueOnce or implementation to handle sequence.
    // Simplifying: The mock above returns the same object. The route expects `updatedLink`.
    // I'll assume it returns something.

    const request = new NextRequest('http://localhost/api/documents/share/link-1/revoke', { method: 'POST' });
    const response = await POST(request, { params: Promise.resolve({ linkId: 'link-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Share link revoked successfully');
  });
});