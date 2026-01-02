// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/communication/[id]/react/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { PostType } from '@/app/generated/prisma';

const { auth } = require('@/lib/auth');

describe('POST /api/communication/[id]/react', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if post not found', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.communicationPost.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(404);
  });

  it('should return 403 if post belongs to different family', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: 'different-family-id',
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(403);
  });

  it('should return 400 if emoji is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/emoji/i);
  });

  it('should add reaction successfully', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newReaction = {
      id: 'reaction-1',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '👍',
      createdAt: new Date(),
      member: {
        id: session.user.id,
        name: session.user.name,
      },
    };

    const updatedPost = {
      ...existingPost,
      reactions: [newReaction],
      _count: { reactions: 1 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.upsert.mockResolvedValue(newReaction as any);
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.reactions).toHaveLength(1);
    expect(data.post.reactions[0].emoji).toBe('👍');
  });

  it('should handle duplicate reaction (idempotent)', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingReaction = {
      id: 'reaction-1',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '👍',
      createdAt: new Date(),
      member: {
        id: session.user.id,
        name: session.user.name,
      },
    };

    const updatedPost = {
      ...existingPost,
      reactions: [existingReaction],
      _count: { reactions: 1 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.upsert.mockResolvedValue(existingReaction as any);
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '👍' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.reactions).toHaveLength(1);
  });

  it('should allow multiple different emojis from same member', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const reaction1 = {
      id: 'reaction-1',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '👍',
      createdAt: new Date(),
      member: {
        id: session.user.id,
        name: session.user.name,
      },
    };

    const reaction2 = {
      id: 'reaction-2',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '❤️',
      createdAt: new Date(),
      member: {
        id: session.user.id,
        name: session.user.name,
      },
    };

    const updatedPost = {
      ...existingPost,
      reactions: [reaction1, reaction2],
      _count: { reactions: 2 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.upsert.mockResolvedValue(reaction2 as any);
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '❤️' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.reactions).toHaveLength(2);
  });

  it('should allow child to react to posts', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newReaction = {
      id: 'reaction-1',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '🎉',
      createdAt: new Date(),
      member: {
        id: session.user.id,
        name: session.user.name,
      },
    };

    const updatedPost = {
      ...existingPost,
      reactions: [newReaction],
      _count: { reactions: 1 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.upsert.mockResolvedValue(newReaction as any);
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: '🎉' }),
    }) as NextRequest;

    const response = await POST(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/communication/[id]/react', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {
    auth.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if post not found', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    prismaMock.communicationPost.findUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(404);
  });

  it('should return 403 if post belongs to different family', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: 'different-family-id',
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(403);
  });

  it('should return 400 if emoji is missing', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/emoji/i);
  });

  it('should remove own reaction successfully', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingReaction = {
      id: 'reaction-1',
      postId: 'post-123',
      memberId: session.user.id,
      emoji: '👍',
      createdAt: new Date(),
    };

    const updatedPost = {
      ...existingPost,
      reactions: [],
      _count: { reactions: 0 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.post.reactions).toHaveLength(0);
    expect(prismaMock.postReaction.deleteMany).toHaveBeenCalledWith({
      where: {
        postId: 'post-123',
        memberId: session.user.id,
        emoji: '👍',
      },
    });
  });

  it('should return success even if reaction does not exist (idempotent)', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPost = {
      ...existingPost,
      reactions: [],
      _count: { reactions: 0 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
  });

  it('should only remove own reactions, not others', async () => {
    const session = mockParentSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const otherReaction = {
      id: 'reaction-2',
      postId: 'post-123',
      memberId: 'other-member-id',
      emoji: '👍',
      createdAt: new Date(),
      member: {
        id: 'other-member-id',
        name: 'Other Member',
      },
    };

    const updatedPost = {
      ...existingPost,
      reactions: [otherReaction],
      _count: { reactions: 1 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=👍', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    // Other member's reaction should still be there
    expect(data.post.reactions).toHaveLength(1);
    // Verify we only tried to delete our own reaction
    expect(prismaMock.postReaction.deleteMany).toHaveBeenCalledWith({
      where: {
        postId: 'post-123',
        memberId: session.user.id,
        emoji: '👍',
      },
    });
  });

  it('should allow child to remove own reactions', async () => {
    const session = mockChildSession();
    auth.mockResolvedValue(session);

    const existingPost = {
      id: 'post-123',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test content',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: 'author-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPost = {
      ...existingPost,
      reactions: [],
      _count: { reactions: 0 },
    };

    prismaMock.communicationPost.findUnique.mockResolvedValue(existingPost as any);
    prismaMock.postReaction.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.communicationPost.findUnique.mockResolvedValue(updatedPost as any);

    const request = new Request('http://localhost/api/communication/post-123/react?emoji=🎉', {
      method: 'DELETE',
    }) as NextRequest;

    const response = await DELETE(request, { params: { id: 'post-123' } });

    expect(response.status).toBe(200);
  });
});
