import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/documents/[id]/share/route';
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
jest.mock('@/lib/data/documents', () => ({
  createDocumentShareLink: jest.fn(),
}));

// Mock Supabase
const mockSupabase = {
  from: jest.fn((table) => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
    };

    if (table === 'documents') {
      mockQuery.single.mockResolvedValue({
        data: { id: 'doc-1', family_id: 'family-test-123', name: 'Doc' }
      });
    } else if (table === 'document_share_links') {
        mockQuery.order.mockResolvedValue({
            data: [
                { id: 'link-1', token: 'token-1', created_at: new Date().toISOString() }
            ]
        });
    } else if (table === 'audit_logs') {
        mockQuery.insert.mockResolvedValue({ error: null });
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

import { createDocumentShareLink } from '@/lib/data/documents';

describe('/api/documents/[id]/share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return share links', async () => {
        const session = mockParentSession();
        const request = new NextRequest('http://localhost/api/documents/doc-1/share');
        const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.shareLinks).toHaveLength(1);
        expect(data.shareLinks[0].token).toBe('token-1');
    });
  });

  describe('POST', () => {
    it('should return 403 if not parent', async () => {
        const session = mockChildSession();
        const request = new NextRequest('http://localhost/api/documents/doc-1/share', {
            method: 'POST',
            body: JSON.stringify({})
        });
        const response = await POST(request, { params: Promise.resolve({ id: 'doc-1' }) });
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('Only parents');
    });

    it('should create share link', async () => {
        const session = mockParentSession();
        
        (createDocumentShareLink as jest.Mock).mockResolvedValue({
            id: 'link-2',
            token: 'token-2',
            expiresAt: null
        });

        const request = new NextRequest('http://localhost/api/documents/doc-1/share', {
            method: 'POST',
            body: JSON.stringify({ expiresInHours: 24 })
        });
        const response = await POST(request, { params: Promise.resolve({ id: 'doc-1' }) });
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.shareLink.token).toBe('token-2');
        expect(createDocumentShareLink).toHaveBeenCalled();
    });
  });
});