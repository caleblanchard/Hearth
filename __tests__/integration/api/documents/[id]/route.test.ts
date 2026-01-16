// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/documents/[id]/route';

describe('/api/documents/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  const mockSession = {
    user: {
      id: 'parent-test-123',
      familyId: 'family-test-123',
      role: 'PARENT' as const,
    },
  };

  const mockDocument = {
    id: 'doc-1',
    familyId: 'family-test-123',
    name: 'Passport.pdf',
    category: 'IDENTITY',
    fileUrl: '/uploads/passport.pdf',
    fileSize: 1024000,
    mimeType: 'application/pdf',
    documentNumber: '123456789',
    issuedDate: new Date('2020-01-01'),
    expiresAt: new Date('2030-01-01'),
    tags: ['passport', 'travel'],
    notes: 'John\'s passport',
    uploadedBy: 'parent-test-123',
    accessList: ['parent-test-123', 'child-test-123'],
    createdAt: new Date(),
    updatedAt: new Date(),
    uploader: {
      id: 'parent-test-123',
      name: 'Parent',
    },
    versions: [],
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 404 if document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-999', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-999' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      prismaMock.document.findUnique.mockResolvedValue({
        ...mockDocument,
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(403);
    });

    it('should return document and log access', async () => {
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);
      prismaMock.documentAccessLog.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'GET',
      });
      const response = await GET(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.name).toBe('Passport.pdf');

      // Verify access was logged
      expect(prismaMock.documentAccessLog.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-1',
          accessedBy: 'parent-test-123',
          ipAddress: 'unknown',
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_ACCESSED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            documentName: 'Passport.pdf',
          },
        },
      });
    });
  });

  describe('PATCH', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated.pdf' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated.pdf' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 404 if document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-999', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated.pdf' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-999' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      prismaMock.document.findUnique.mockResolvedValue({
        ...mockDocument,
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated.pdf' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid category', async () => {
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ category: 'INVALID' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(400);
    });

    it('should update document successfully', async () => {
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);
      prismaMock.document.update.mockResolvedValue({
        ...mockDocument,
        name: 'Updated Passport.pdf',
        notes: 'Updated notes',
      } as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Updated Passport.pdf',
          notes: 'Updated notes',
        }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.name).toBe('Updated Passport.pdf');
      expect(data.message).toBe('Document updated successfully');

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_UPDATED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            documentName: 'Updated Passport.pdf',
          },
        },
      });
    });

    it('should handle partial updates', async () => {
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);
      prismaMock.document.update.mockResolvedValue(mockDocument as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'PATCH',
        body: JSON.stringify({ tags: ['passport', 'international', 'travel'] }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(200);
      expect(prismaMock.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: expect.objectContaining({
          tags: ['passport', 'international', 'travel'],
        }),
        include: {
          uploader: { select: { id: true, name: true } },
        },
      });
    });
  });

  describe('DELETE', () => {
    it('should return 401 if not authenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 404 if document not found', async () => {
      prismaMock.document.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-999', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-999' }) });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      prismaMock.document.findUnique.mockResolvedValue({
        ...mockDocument,
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(403);
    });

    it('should delete document successfully', async () => {
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);
      prismaMock.document.delete.mockResolvedValue(mockDocument as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'doc-1' }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Document deleted successfully');

      expect(prismaMock.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_DELETED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            documentName: 'Passport.pdf',
          },
        },
      });
    });
  });
});
