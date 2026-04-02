import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/documents/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn((msg, err) => console.log('LOGGER ERROR:', msg, err)),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock data module
jest.mock('@/lib/data/documents', () => ({
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
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
      return session?.user?.role === 'PARENT';
    }),
  };
});

import { getDocument, updateDocument, deleteDocument } from '@/lib/data/documents';

describe('/api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 404 if document not found', async () => {
      const session = mockParentSession();
      (getDocument as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/documents/doc-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Document not found');
    });

    it('should return 403 if family mismatch', async () => {
      const session = mockParentSession();
      (getDocument as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        family_id: 'other-family'
      });

      const request = new NextRequest('http://localhost/api/documents/doc-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return document', async () => {
      const session = mockParentSession();
      const mockDoc = { id: 'doc-1', family_id: session.user.familyId, name: 'Doc' };
      (getDocument as jest.Mock).mockResolvedValue(mockDoc);

      const request = new NextRequest('http://localhost/api/documents/doc-1');
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.document).toEqual(mockDoc);
    });
  });

  describe('PATCH', () => {
    it('should return 403 if not parent', async () => {
      const session = mockChildSession();
      const request = new NextRequest('http://localhost/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' })
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only parents');
    });

    it('should update document', async () => {
      const session = mockParentSession();
      const mockDoc = { id: 'doc-1', family_id: session.user.familyId };
      (getDocument as jest.Mock).mockResolvedValue(mockDoc);
      (updateDocument as jest.Mock).mockResolvedValue({ ...mockDoc, name: 'New Name' });

      const request = new NextRequest('http://localhost/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' })
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      if (response.status !== 200) console.log('Response:', data);
      expect(response.status).toBe(200);
      expect(data.document.name).toBe('New Name');
      expect(updateDocument).toHaveBeenCalled();
    });
  });

  describe('DELETE', () => {
    it('should return 403 if not parent', async () => {
      const session = mockChildSession();
      const request = new NextRequest('http://localhost/api/documents/doc-1', {
        method: 'DELETE'
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only parents');
    });

    it('should delete document', async () => {
      const session = mockParentSession();
      const mockDoc = { id: 'doc-1', family_id: session.user.familyId };
      (getDocument as jest.Mock).mockResolvedValue(mockDoc);

      const request = new NextRequest('http://localhost/api/documents/doc-1', {
        method: 'DELETE'
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteDocument).toHaveBeenCalledWith('doc-1');
    });
  });
});