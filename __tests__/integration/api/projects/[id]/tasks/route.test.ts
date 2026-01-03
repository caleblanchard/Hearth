// Set up mocks BEFORE any imports
import { prismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/[id]/tasks/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('GET /api/projects/[id]/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValue(null);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {
      auth.mockResolvedValue(mockChildSession());

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage projects');
    });
  });

  describe('Task Listing', () => {
    it('should return all tasks for a project', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      const mockTasks = [
        {
          id: 'task-1',
          projectId: 'project-1',
          name: 'Book venue',
          description: 'Find and book party venue',
          status: 'COMPLETED',
          assigneeId: 'parent-test-123',
          dueDate: new Date('2026-02-10'),
          estimatedHours: 2,
          actualHours: 1.5,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignee: {
            id: 'parent-test-123',
            name: 'Test Parent',
          },
          _count: {
            dependencies: 0,
            dependents: 1,
          },
        },
        {
          id: 'task-2',
          projectId: 'project-1',
          name: 'Send invitations',
          description: null,
          status: 'IN_PROGRESS',
          assigneeId: null,
          dueDate: new Date('2026-02-12'),
          estimatedHours: 1,
          actualHours: null,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignee: null,
          _count: {
            dependencies: 1,
            dependents: 0,
          },
        },
      ];

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.findMany.mockResolvedValue(mockTasks as any);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tasks).toHaveLength(2);
      expect(data.tasks[0].name).toBe('Book venue');
      expect(data.tasks[1].name).toBe('Send invitations');
    });

    it('should return 404 if project not found', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/nonexistent/tasks'),
        { params: { id: 'nonexistent' } }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 if project belongs to different family', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'different-family',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return empty array when project has no tasks', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.findMany.mockResolvedValue([]);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tasks).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database query fails', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.findMany.mockRejectedValue(new Error('Database error'));

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks'),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch tasks');
    });
  });
});

describe('POST /api/projects/[id]/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValue(null);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {
      auth.mockResolvedValue(mockChildSession());

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Validation', () => {
    it('should return 404 if project not found', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/nonexistent/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'nonexistent' } }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 if project belongs to different family', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'different-family',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 if name is missing', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ description: 'Task description' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Task name is required');
    });

    it('should return 400 if name is empty string', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: '   ' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Task name is required');
    });

    it('should return 400 if status is invalid', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Task',
            status: 'INVALID_STATUS',
          }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });

    it('should return 400 if estimatedHours is negative', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Task',
            estimatedHours: -5,
          }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Estimated hours must be a positive number');
    });

    it('should return 400 if actualHours is negative', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Task',
            actualHours: -3,
          }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Actual hours must be a positive number');
    });
  });

  describe('Task Creation', () => {
    it('should create a task with minimal data', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'New Task',
        description: null,
        status: 'PENDING',
        assigneeId: null,
        dueDate: null,
        estimatedHours: null,
        actualHours: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(0);
      prismaMock.projectTask.create.mockResolvedValue(mockTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.task.name).toBe('New Task');
      expect(data.task.status).toBe('PENDING');
      expect(data.message).toBe('Task created successfully');
    });

    it('should create a task with all fields', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(2);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Book venue',
            description: 'Find and book party venue',
            status: 'IN_PROGRESS',
            assigneeId: 'parent-test-123',
            dueDate: '2026-02-10',
            estimatedHours: 2,
            actualHours: 0.5,
          }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(201);
      expect(prismaMock.projectTask.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-1',
          name: 'Book venue',
          description: 'Find and book party venue',
          status: 'IN_PROGRESS',
          assigneeId: 'parent-test-123',
          dueDate: new Date('2026-02-10'),
          estimatedHours: 2,
          actualHours: 0.5,
          sortOrder: 2,
        },
      });
    });

    it('should auto-increment sortOrder', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(5);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(prismaMock.projectTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 5,
          }),
        })
      );
    });

    it('should trim whitespace from name', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(0);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: '  New Task  ' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(prismaMock.projectTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Task',
          }),
        })
      );
    });

    it('should default status to PENDING', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(0);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(prismaMock.projectTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log on successful task creation', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      const mockTask = {
        id: 'task-1',
        name: 'New Task',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(0);
      prismaMock.projectTask.create.mockResolvedValue(mockTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_TASK_CREATED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            taskId: 'task-1',
            name: 'New Task',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.count.mockResolvedValue(0);
      prismaMock.projectTask.create.mockRejectedValue(new Error('Database error'));

      const response = await POST(
        new NextRequest('http://localhost:3000/api/projects/project-1/tasks', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Task' }),
        }),
        { params: { id: 'project-1' } }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create task');
    });
  });
});
