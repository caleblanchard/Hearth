// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn(() => 'mock-random-token-123456'),
  })),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/documents/[id]/share/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/documents/[id]/share', () => {
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
    tags: ['passport'],
    notes: 'Passport',
    uploadedBy: 'parent-test-123',
    accessList: ['parent-test-123'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'doc-1' } });

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

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(403);
    });

    it('should return 404 if document not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-999/share', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'doc-999' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue({
        ...mockDocument,
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(403);
    });

    it('should create share link with expiration', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);

      const mockShareLink = {
        id: 'share-1',
        documentId: 'doc-1',
        token: 'mock-random-token-123456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recipientEmail: 'recipient@example.com',
        notes: 'Share with friend',
        createdBy: 'parent-test-123',
        createdAt: new Date(),
        accessCount: 0,
        lastAccessedAt: null,
        revokedAt: null,
        revokedBy: null,
        creator: {
          id: 'parent-test-123',
          name: 'Parent',
        },
      };

      prismaMock.documentShareLink.create.mockResolvedValue(mockShareLink as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'POST',
        body: JSON.stringify({
          expiresInDays: 7,
          recipientEmail: 'recipient@example.com',
          notes: 'Share with friend',
        }),
      });
      const response = await POST(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.shareLink.token).toBe('mock-random-token-123456');
      expect(data.shareUrl).toContain('mock-random-token-123456');
      expect(data.message).toBe('Share link created successfully');

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
            recipientEmail: 'recipient@example.com',
          },
        },
      });
    });

    it('should create share link without expiration', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);

      const mockShareLink = {
        id: 'share-2',
        documentId: 'doc-1',
        token: 'mock-random-token-123456',
        expiresAt: null,
        recipientEmail: null,
        notes: null,
        createdBy: 'parent-test-123',
        createdAt: new Date(),
        accessCount: 0,
        lastAccessedAt: null,
        revokedAt: null,
        revokedBy: null,
        creator: {
          id: 'parent-test-123',
          name: 'Parent',
        },
      };

      prismaMock.documentShareLink.create.mockResolvedValue(mockShareLink as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.shareLink.expiresAt).toBeNull();
    });
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(401);
    });

    it('should return 404 if document not found', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-999/share', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'doc-999' } });

      expect(response.status).toBe(404);
    });

    it('should return 403 if document belongs to different family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue({
        ...mockDocument,
        familyId: 'different-family-123',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(403);
    });

    it('should return all share links for document', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findUnique.mockResolvedValue(mockDocument as any);

      const mockShareLinks = [
        {
          id: 'share-1',
          documentId: 'doc-1',
          token: 'token-1',
          expiresAt: new Date(),
          recipientEmail: 'user1@example.com',
          notes: 'Share 1',
          createdBy: 'parent-test-123',
          createdAt: new Date(),
          accessCount: 5,
          lastAccessedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          creator: { id: 'parent-test-123', name: 'Parent' },
        },
        {
          id: 'share-2',
          documentId: 'doc-1',
          token: 'token-2',
          expiresAt: null,
          recipientEmail: null,
          notes: null,
          createdBy: 'parent-test-123',
          createdAt: new Date(),
          accessCount: 0,
          lastAccessedAt: null,
          revokedAt: null,
          revokedBy: null,
          creator: { id: 'parent-test-123', name: 'Parent' },
        },
      ];

      prismaMock.documentShareLink.findMany.mockResolvedValue(mockShareLinks as any);

      const request = new NextRequest('http://localhost:3000/api/documents/doc-1/share', {
        method: 'GET',
      });
      const response = await GET(request, { params: { id: 'doc-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shareLinks).toHaveLength(2);
      expect(data.shareLinks[0].token).toBe('token-1');

      expect(prismaMock.documentShareLink.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc-1' },
        include: {
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
