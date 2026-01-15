// Set up mocks BEFORE any imports
import { prismaMock, resetPrismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/communication/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';
import { PostType } from '@/app/generated/prisma';

describe('GET /api/communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/communication', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return empty array if no posts exist', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/communication', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toEqual([]);
  });

  it('should return all family posts', async () => {
    const session = mockParentSession();

    const mockPosts = [
      {
        id: 'post-1',
        familyId: session.user.familyId,
        type: PostType.ANNOUNCEMENT,
        title: 'Important Update',
        content: 'Family meeting tonight',
        imageUrl: null,
        isPinned: true,
        expiresAt: null,
        authorId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: session.user.id,
          name: session.user.name,
        },
        reactions: [],
        _count: {
          reactions: 0,
        },
      },
      {
        id: 'post-2',
        familyId: session.user.familyId,
        type: PostType.KUDOS,
        title: null,
        content: 'Great job on homework!',
        imageUrl: null,
        isPinned: false,
        expiresAt: null,
        authorId: 'child-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: 'child-123',
          name: 'Child User',
        },
        reactions: [
          {
            id: 'reaction-1',
            emoji: '👍',
            memberId: session.user.id,
            member: {
              id: session.user.id,
              name: session.user.name,
            },
          },
        ],
        _count: {
          reactions: 1,
        },
      },
    ];

    prismaMock.communicationPost.findMany.mockResolvedValue(mockPosts as any);
    prismaMock.communicationPost.count.mockResolvedValue(2);

    const request = new Request('http://localhost/api/communication', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveLength(2);
    expect(data.data[0].isPinned).toBe(true);
  });

  it('should filter posts by type', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/communication?type=KUDOS', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.communicationPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'KUDOS',
        }),
      })
    );
  });

  it('should return only pinned posts when filter applied', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/communication?pinned=true', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.communicationPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPinned: true,
        }),
      })
    );
  });

  it('should support pagination', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(50);

    const request = new Request('http://localhost/api/communication?limit=10&page=3', {
      method: 'GET',
    }) as NextRequest;

    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.pagination.total).toBe(50);
    expect(prismaMock.communicationPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
  });

  it('should order posts by pinned first then created desc', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/communication', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.communicationPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      })
    );
  });

  it('should not return posts from other families', async () => {
    const session = mockParentSession();

    prismaMock.communicationPost.findMany.mockResolvedValue([]);
    prismaMock.communicationPost.count.mockResolvedValue(0);

    const request = new Request('http://localhost/api/communication', {
      method: 'GET',
    }) as NextRequest;

    await GET(request);

    expect(prismaMock.communicationPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          familyId: session.user.familyId,
        }),
      })
    );
  });
});

describe('POST /api/communication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrismaMock();
  });

  it('should return 401 if not authenticated', async () => {

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NOTE',
        content: 'Test post',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 403 if child tries to post announcement', async () => {
    const session = mockChildSession();

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ANNOUNCEMENT',
        title: 'Important',
        content: 'Test announcement',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain('Only parents can post announcements');
  });

  it('should allow parent to create announcement', async () => {
    const session = mockParentSession();

    const mockPost = {
      id: 'post-1',
      familyId: session.user.familyId,
      type: PostType.ANNOUNCEMENT,
      title: 'Important Update',
      content: 'Family meeting tonight',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.create.mockResolvedValue(mockPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'ANNOUNCEMENT',
        title: 'Important Update',
        content: 'Family meeting tonight',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.post.type).toBe('ANNOUNCEMENT');
    expect(data.post.title).toBe('Important Update');
  });

  it('should allow child to post kudos', async () => {
    const session = mockChildSession();

    const mockPost = {
      id: 'post-1',
      familyId: session.user.familyId,
      type: PostType.KUDOS,
      title: null,
      content: 'Great job!',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.create.mockResolvedValue(mockPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'KUDOS',
        content: 'Great job!',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.post.type).toBe('KUDOS');
  });

  it('should allow parent to create note', async () => {
    const session = mockParentSession();

    const mockPost = {
      id: 'post-1',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Remember to take out trash',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.create.mockResolvedValue(mockPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NOTE',
        content: 'Remember to take out trash',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
  });

  it('should create post with photo', async () => {
    const session = mockParentSession();

    const mockPost = {
      id: 'post-1',
      familyId: session.user.familyId,
      type: PostType.PHOTO,
      title: 'Family Vacation',
      content: 'Beach day!',
      imageUrl: 'https://example.com/photo.jpg',
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.create.mockResolvedValue(mockPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'PHOTO',
        title: 'Family Vacation',
        content: 'Beach day!',
        imageUrl: 'https://example.com/photo.jpg',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.post.imageUrl).toBe('https://example.com/photo.jpg');
  });

  it('should return 400 if content is missing', async () => {
    const session = mockParentSession();

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NOTE',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toMatch(/content/i);
  });

  it('should return 400 if type is invalid', async () => {
    const session = mockParentSession();

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'INVALID_TYPE',
        content: 'Test',
      }),
    }) as NextRequest;

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('type');
  });

  it('should create audit log on post creation', async () => {
    const session = mockParentSession();

    const mockPost = {
      id: 'post-1',
      familyId: session.user.familyId,
      type: PostType.NOTE,
      title: null,
      content: 'Test note',
      imageUrl: null,
      isPinned: false,
      expiresAt: null,
      authorId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prismaMock.communicationPost.create.mockResolvedValue(mockPost as any);
    prismaMock.auditLog.create.mockResolvedValue({} as any);

    const request = new Request('http://localhost/api/communication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NOTE',
        content: 'Test note',
      }),
    }) as NextRequest;

    await POST(request);

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'POST_CREATED',
        }),
      })
    );
  });
});
