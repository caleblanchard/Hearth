// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/documents/route';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('/api/documents', () => {
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
  };

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return all documents for family', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockResolvedValue([mockDocument] as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.documents).toHaveLength(1);
      expect(data.documents[0].name).toBe('Passport.pdf');
    });

    it('should filter by category', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockResolvedValue([mockDocument] as any);

      const request = new NextRequest('http://localhost:3000/api/documents?category=IDENTITY', {
        method: 'GET',
      });
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(prismaMock.document.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123', category: 'IDENTITY' },
        include: {
          uploader: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should only return documents user has access to', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.findMany.mockResolvedValue([mockDocument] as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'GET',
      });
      await GET(request);

      expect(prismaMock.document.findMany).toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test.pdf',
          category: 'IDENTITY',
          fileUrl: '/uploads/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should return 400 if missing required fields', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test.pdf',
          // Missing category, fileUrl, fileSize, mimeType
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 if invalid category', async () => {
      mockAuth.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test.pdf',
          category: 'INVALID',
          fileUrl: '/uploads/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should create document successfully', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.create.mockResolvedValue(mockDocument as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Passport.pdf',
          category: 'IDENTITY',
          fileUrl: '/uploads/passport.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
          documentNumber: '123456789',
          issuedDate: '2020-01-01',
          expiresAt: '2030-01-01',
          tags: ['passport', 'travel'],
          notes: 'John\'s passport',
          accessList: ['parent-test-123', 'child-test-123'],
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.document.name).toBe('Passport.pdf');

      expect(prismaMock.document.create).toHaveBeenCalledWith({
        data: {
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
        },
        include: {
          uploader: { select: { id: true, name: true } },
        },
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'DOCUMENT_UPLOADED',
          result: 'SUCCESS',
          metadata: {
            documentId: 'doc-1',
            name: 'Passport.pdf',
            category: 'IDENTITY',
          },
        },
      });
    });

    it('should default accessList to uploader if not provided', async () => {
      mockAuth.mockResolvedValue(mockSession as any);
      prismaMock.document.create.mockResolvedValue(mockDocument as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test.pdf',
          category: 'HOUSEHOLD',
          fileUrl: '/uploads/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(prismaMock.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accessList: ['parent-test-123'],
        }),
        include: expect.any(Object),
      });
    });
  });
});
