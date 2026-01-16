// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/communication/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { PostType } from '@/app/generated/prisma';

describe('PATCH /api/communication/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if post not found', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if post belongs to different family', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: 'different-family-id',
      type: PostType.NOTE,
      title: null,
      content: 'Original content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(403);
  });

  it('should return 403 if non-author tries to edit content', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Original content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'different-author-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Only the author can edit');
  });

  it('should allow author to update content', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Original content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPost = {
      ...existingPost,
      content: 'Updated content',
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.update.mockResolvedValue(updatedPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated content' }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.content).toBe('Updated content');
  });

  it('should allow parent to pin any post', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'child-123', // Not the parent
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPost = {
      ...existingPost,
      isPinned: true,
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.update.mockResolvedValue(updatedPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: true }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.isPinned).toBe(true);
  });

  it('should return 403 if child tries to pin post', async () => {
    const session = mockChildSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: true }),
    }) as NextRequest;

    const response = await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Only parents can pin');
  });

  it('should create audit log on update', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Original',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.update.mockResolvedValue({ ...existingPost, content: 'Updated' } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Updated' }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'POST_UPDATED',
        }),
      })
    );
  });

  it('should create pin audit log when pinning', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.update.mockResolvedValue({ ...existingPost, isPinned: true } as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: true }),
    }) as NextRequest;

    await PATCH(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'POST_PINNED',
        }),
      })
    );
  });
});

describe('DELETE /api/communication/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(401);
  });

  it('should return 404 if post not found', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(404);
  });

  it('should return 403 if post belongs to different family', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: 'different-family-id',
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(403);
  });

  it('should allow author to delete own post', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.delete.mockResolvedValue(existingPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(200);
    expect(prismaMock.communicationPost.delete).toHaveBeenCalledWith({
      where: { id: 'post-123' },
    });
  });

  it('should allow parent to delete any post', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'child-123', // Not the parent
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.delete.mockResolvedValue(existingPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(200);
  });

  it('should return 403 if child tries to delete others post', async () => {
    const session = mockChildSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'different-child-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('permission');
  });

  it('should create audit log on deletion', async () => {
    const session = mockParentSession();

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.communicationPost.delete.mockResolvedValue(existingPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication/post-123', {
      method: 'DELETE',
    }) as NextRequest;

    await DELETE(request, { params: Promise.resolve({ id: 'post-123' }) });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'POST_DELETED',
        }),
      })
    );
  });
});
