// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/documents/expiring/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/documents/expiring', () => {
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

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents/expiring', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return documents expiring within default 90 days', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const mockExpiringDocuments = [
        {
          id: 'doc-1',
          familyId: 'family-test-123',
          name: 'Passport.pdf',
          category: 'IDENTITY',
          fileUrl: '/uploads/passport.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentNumber: '123456789',
          issuedDate: new Date('2020-01-01'),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          tags: ['passport'],
          notes: 'Expiring soon',
          uploadedBy: 'parent-test-123',
          accessList: ['parent-test-123'],
          createdAt: new Date(),
          updatedAt: new Date(),
          uploader: {
            id: 'parent-test-123',
            name: 'Parent',
          },
        },
      ];

      prismaMock.document.findMany.mockResolvedValue(mockExpiringDocuments as any);

      const request = new NextRequest('http://localhost:3000/api/documents/expiring', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].name).toBe('Passport.pdf');

      // Verify call with default 90 days
      const callArgs = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.familyId).toBe('family-test-123');
      expect(callArgs.where.expiresAt.gte).toBeDefined();
      expect(callArgs.where.expiresAt.lte).toBeDefined();
    });

    it('should accept custom days parameter', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/documents/expiring?days=30', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);

      // Verify call with custom 30 days
      const callArgs = (prismaMock.document.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.familyId).toBe('family-test-123');
      expect(callArgs.where.expiresAt.gte).toBeDefined();
      expect(callArgs.where.expiresAt.lte).toBeDefined();
    });

    it('should only return documents from user family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/documents/expiring', {
        method: 'GET',
      });
      await GET(request);

      expect(prismaMock.document.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          familyId: 'family-test-123',
        }),
        include: {
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { expiresAt: 'asc' },
      });
    });

    it('should order documents by expiration date ascending', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const mockDocuments = [
        {
          id: 'doc-1',
          name: 'First to Expire',
          expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          uploader: { id: 'parent-test-123', name: 'Parent' },
        },
        {
          id: 'doc-2',
          name: 'Second to Expire',
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          uploader: { id: 'parent-test-123', name: 'Parent' },
        },
      ];

      prismaMock.document.findMany.mockResolvedValue(mockDocuments as any);

      const request = new NextRequest('http://localhost:3000/api/documents/expiring', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents[0].name).toBe('First to Expire');

      expect(prismaMock.document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { expiresAt: 'asc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/documents/expiring', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch expiring documents');
    });
  });
});
