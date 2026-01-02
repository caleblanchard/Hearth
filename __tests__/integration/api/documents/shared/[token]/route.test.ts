// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/documents/shared/[token]/route';

describe('/api/documents/shared/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

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
    tags: ['passport'],
    notes: 'Passport document',
    uploadedBy: 'parent-test-123',
    accessList: ['parent-test-123'],
    createdAt: new Date(),
    updatedAt: new Date(),
    uploader: {
      id: 'parent-test-123',
      name: 'Parent',
    },
  };

  const mockShareLink = {
    id: 'share-1',
    documentId: 'doc-1',
    token: 'valid-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    recipientEmail: 'recipient@example.com',
    notes: 'Shared with recipient',
    createdBy: 'parent-test-123',
    createdAt: new Date(),
    accessCount: 0,
    lastAccessedAt: null,
    revokedAt: null,
    revokedBy: null,
    document: mockDocument,
    creator: {
      id: 'parent-test-123',
      name: 'Parent',
    },
  };

  describe('GET', () => {
    it('should return 404 if share link not found', async () => {
      prismaMock.documentShareLink.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/shared/invalid-token', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'invalid-token' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Share link not found');
    });

    it('should return 410 if share link is expired', async () => {
      const expiredShareLink = {
        ...mockShareLink,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };

      prismaMock.documentShareLink.findUnique.mockResolvedValue(expiredShareLink as any);

      const request = new NextRequest('http://localhost:3000/api/documents/shared/expired-token', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'expired-token' } });

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toBe('Share link has expired');
    });

    it('should return 410 if share link is revoked', async () => {
      const revokedShareLink = {
        ...mockShareLink,
        revokedAt: new Date(),
        revokedBy: 'parent-test-123',
      };

      prismaMock.documentShareLink.findUnique.mockResolvedValue(revokedShareLink as any);

      const request = new NextRequest('http://localhost:3000/api/documents/shared/revoked-token', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'revoked-token' } });

      expect(response.status).toBe(410);
      const data = await response.json();
      expect(data.error).toBe('Share link has been revoked');
    });

    it('should return document and increment access count', async () => {
      prismaMock.documentShareLink.findUnique.mockResolvedValue(mockShareLink as any);
      prismaMock.documentShareLink.update.mockResolvedValue({} as any);
      prismaMock.documentAccessLog.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/shared/valid-token-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'valid-token-123' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.document.name).toBe('Passport.pdf');
      expect(data.document.fileUrl).toBe('/uploads/passport.pdf');
      expect(data.shareInfo.createdBy).toBe('Parent');
      expect(data.shareInfo.notes).toBe('Shared with recipient');

      // Verify access count was incremented
      expect(prismaMock.documentShareLink.update).toHaveBeenCalledWith({
        where: { id: 'share-1' },
        data: {
          accessCount: { increment: 1 },
          lastAccessedAt: expect.any(Date),
        },
      });

      // Verify access was logged
      expect(prismaMock.documentAccessLog.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-1',
          accessedBy: null, // External access
          ipAddress: 'unknown',
          userAgent: 'unknown',
          viaShareLink: 'share-1',
        },
      });

      // Verify audit log was created
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_SHARE_ACCESSED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            documentName: 'Passport.pdf',
            shareLinkId: 'share-1',
            token: 'valid-token-123',
          },
        },
      });
    });

    it('should not expose sensitive document fields', async () => {
      prismaMock.documentShareLink.findUnique.mockResolvedValue(mockShareLink as any);
      prismaMock.documentShareLink.update.mockResolvedValue({} as any);
      prismaMock.documentAccessLog.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/shared/valid-token-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'valid-token-123' } });

      const data = await response.json();

      // Should include basic document info
      expect(data.document.id).toBeDefined();
      expect(data.document.name).toBeDefined();
      expect(data.document.category).toBeDefined();
      expect(data.document.fileUrl).toBeDefined();
      expect(data.document.fileSize).toBeDefined();
      expect(data.document.mimeType).toBeDefined();
      expect(data.document.notes).toBeDefined();
      expect(data.document.uploader).toBeDefined();

      // Should NOT expose sensitive fields like familyId, uploadedBy, accessList
      expect(data.document.familyId).toBeUndefined();
      expect(data.document.uploadedBy).toBeUndefined();
      expect(data.document.accessList).toBeUndefined();
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.documentShareLink.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/documents/shared/valid-token-123', {
        method: 'GET',
      });
      const response = await GET(request, { params: { token: 'valid-token-123' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to access shared document');
    });
  });
});
