import { NextRequest } from 'next/server';
import { GET } from '@/app/api/documents/shared/[token]/route';

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
        mockQuery.eq.mockReturnThis(); // needed for chaining
    }
    
    return mockQuery;
  })
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('/api/documents/shared/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDocument = {
    id: 'doc-1',
    family_id: 'family-test-123',
    name: 'Passport.pdf',
    category: 'IDENTITY',
    file_url: '/uploads/passport.pdf',
    file_size: 1024000,
    mime_type: 'application/pdf',
    notes: 'Passport document',
    uploader: {
      id: 'parent-test-123',
      name: 'Parent',
    },
  };

  const mockShareLink = {
    id: 'share-1',
    document_id: 'doc-1',
    token: 'valid-token-123',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    revoked_at: null,
    created_by: 'parent-test-123',
    created_at: new Date().toISOString(),
    document: mockDocument,
  };

  describe('GET', () => {
    it('should return 404 if share link not found', async () => {
        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis()
        });

        const request = new NextRequest('http://localhost:3000/api/documents/shared/invalid-token');
        const response = await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBe('Share link not found');
    });

    it('should return 410 if share link is expired', async () => {
        const expiredLink = {
            ...mockShareLink,
            expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        };

        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: expiredLink }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis()
        });

        const request = new NextRequest('http://localhost:3000/api/documents/shared/expired-token');
        const response = await GET(request, { params: Promise.resolve({ token: 'expired-token' }) });

        expect(response.status).toBe(410);
        const data = await response.json();
        expect(data.error).toBe('Share link has expired');
    });

    it('should return 410 if share link is revoked', async () => {
        const revokedLink = {
            ...mockShareLink,
            revoked_at: new Date().toISOString(),
        };

        mockSupabase.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: revokedLink }),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis()
        });

        const request = new NextRequest('http://localhost:3000/api/documents/shared/revoked-token');
        const response = await GET(request, { params: Promise.resolve({ token: 'revoked-token' }) });

        expect(response.status).toBe(410);
        const data = await response.json();
        expect(data.error).toBe('Share link has been revoked');
    });

    it('should return document and increment access count', async () => {
        mockSupabase.from.mockImplementation((table) => {
            if (table === 'document_share_links') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: mockShareLink }),
                    update: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockReturnThis(),
                };
            }
            if (table === 'document_access_logs' || table === 'audit_logs') {
                return {
                    select: jest.fn().mockReturnThis(),
                    eq: jest.fn().mockReturnThis(),
                    single: jest.fn().mockResolvedValue({ data: null }),
                    update: jest.fn().mockReturnThis(),
                    insert: jest.fn().mockResolvedValue({ error: null }),
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

        const request = new NextRequest('http://localhost:3000/api/documents/shared/valid-token-123');
        const response = await GET(request, { params: Promise.resolve({ token: 'valid-token-123' }) });

        expect(response.status).toBe(200);
        const data = await response.json();
        
        expect(data.document.name).toBe('Passport.pdf');
        expect(data.document.fileUrl).toBe('/uploads/passport.pdf');
        expect(data.shareInfo.createdBy).toBe('parent-test-123');
        expect(data.document.familyId).toBeUndefined(); // Sensitive data check
    });

    it('should handle database errors gracefully', async () => {
        mockSupabase.from.mockImplementation(() => {
            throw new Error('Database error');
        });

        const request = new NextRequest('http://localhost:3000/api/documents/shared/valid-token-123');
        const response = await GET(request, { params: Promise.resolve({ token: 'valid-token-123' }) });

        expect(response.status).toBe(500);
        const data = await response.json();
        expect(data.error).toBe('Failed to access shared document');
    });
  });
});