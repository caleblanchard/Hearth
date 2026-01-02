// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/documents/share/[linkId]/revoke/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/documents/share/[linkId]/revoke', () => {
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
  };

  const mockShareLink = {
    id: 'share-1',
    documentId: 'doc-1',
    token: 'share-token-123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    recipientEmail: 'recipient@example.com',
    notes: 'Shared link',
    createdBy: 'parent-test-123',
    createdAt: new Date(),
    accessCount: 5,
    lastAccessedAt: new Date(),
    revokedAt: null,
    revokedBy: null,
    document: mockDocument,
    creator: {
      id: 'parent-test-123',
      name: 'Parent',
    },
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 403 if not a parent', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'child-test-123',
          familyId: 'family-test-123',
          role: 'CHILD',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(403);
    });

    it('should return 404 if share link not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.documentShareLink.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-999/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-999' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.documentShareLink.findUnique.mockResolvedValue({
        ...mockShareLink,
        document: {
          ...mockDocument,
          familyId: 'different-family-123',
        },
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(403);
    });

    it('should return 400 if share link is already revoked', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.documentShareLink.findUnique.mockResolvedValue({
        ...mockShareLink,
        revokedAt: new Date(),
        revokedBy: 'parent-test-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Share link is already revoked');
    });

    it('should revoke share link successfully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.documentShareLink.findUnique.mockResolvedValue(mockShareLink as any);

      const updatedShareLink = {
        ...mockShareLink,
        revokedAt: new Date(),
        revokedBy: 'parent-test-123',
      };

      prismaMock.documentShareLink.update.mockResolvedValue(updatedShareLink as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Share link revoked successfully');
      expect(data.shareLink.revokedAt).toBeDefined();
      expect(data.shareLink.revokedBy).toBe('parent-test-123');

      expect(prismaMock.documentShareLink.update).toHaveBeenCalledWith({
        where: { id: 'share-1' },
        data: {
          revokedAt: expect.any(Date),
          revokedBy: 'parent-test-123',
        },
        include: {
          creator: { select: { id: true, name: true } },
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_SHARED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            documentName: 'Passport.pdf',
            shareLinkId: 'share-1',
            action: 'revoked',
          },
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.documentShareLink.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/documents/share/share-1/revoke', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { linkId: 'share-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to revoke share link');
    });
  });
});
