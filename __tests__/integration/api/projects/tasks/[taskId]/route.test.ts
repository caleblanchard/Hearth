// Set up mocks BEFORE any imports
import { prismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/projects/tasks/[taskId]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

const { auth } = require('@/lib/auth');

describe('GET /api/projects/tasks/[taskId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {
      auth.mockResolvedValue(mockChildSession());

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Task Retrieval', () => {
    it('should return task details with dependencies', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Design wireframes',
        description: 'Create wireframes for app',
        status: 'IN_PROGRESS',
        assigneeId: 'child-test-123',
        dueDate: new Date('2026-02-15'),
        estimatedHours: 8,
        actualHours: 4,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        project: {
          id: 'project-1',
          familyId: 'family-test-123',
        },
        assignee: {
          id: 'child-test-123',
          name: 'Child User',
        },
        dependencies: [],
        dependents: [],
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.id).toBe('task-1');
      expect(data.task.name).toBe('Design wireframes');
      expect(data.task.assignee.name).toBe('Child User');
    });

    it('should return 404 if task does not exist', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.projectTask.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 if task belongs to different family', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Design wireframes',
        project: {
          id: 'project-1',
          familyId: 'other-family-456',
        },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database query fails', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.projectTask.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1');
      const response = await GET(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch task');
    });
  });
});

describe('PATCH /api/projects/tasks/[taskId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Task' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {
      auth.mockResolvedValue(mockChildSession());

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Task' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Validation', () => {
    it('should return 400 if name is empty string', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: '   ' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name cannot be empty');
    });

    it('should return 400 if status is invalid', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });

    it('should return 400 if estimatedHours is negative', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ estimatedHours: -5 }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Estimated hours must be a positive number');
    });

    it('should return 400 if actualHours is negative', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ actualHours: -3 }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Actual hours must be a positive number');
    });
  });

  describe('Task Updates', () => {
    it('should return 404 if task does not exist', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.projectTask.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Task' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 if task belongs to different family', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'other-family-456' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Task' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should update task name', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Old Task Name',
        project: { familyId: 'family-test-123' },
      };

      const updatedTask = {
        ...mockTask,
        name: 'Updated Task Name',
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(updatedTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Task Name' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.name).toBe('Updated Task Name');
      expect(data.message).toBe('Task updated successfully');
    });

    it('should update task status', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        status: 'PENDING',
        project: { familyId: 'family-test-123' },
      };

      const updatedTask = {
        ...mockTask,
        status: 'IN_PROGRESS',
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(updatedTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.status).toBe('IN_PROGRESS');
    });

    it('should update multiple fields at once', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Old Name',
        status: 'PENDING',
        estimatedHours: 5,
        project: { familyId: 'family-test-123' },
      };

      const updatedTask = {
        ...mockTask,
        name: 'New Name',
        status: 'IN_PROGRESS',
        estimatedHours: 8,
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(updatedTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'New Name',
          status: 'IN_PROGRESS',
          estimatedHours: 8,
        }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.name).toBe('New Name');
      expect(data.task.status).toBe('IN_PROGRESS');
      expect(data.task.estimatedHours).toBe(8);
    });

    it('should trim whitespace from name', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: '  Trimmed Name  ' }),
      });
      await PATCH(request, { params: { taskId: 'task-1' } });

      expect(prismaMock.projectTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Trimmed Name',
          }),
        })
      );
    });

    it('should update assigneeId', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        assigneeId: null,
        project: { familyId: 'family-test-123' },
      };

      const updatedTask = {
        ...mockTask,
        assigneeId: 'child-test-123',
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(updatedTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ assigneeId: 'child-test-123' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.assigneeId).toBe('child-test-123');
    });

    it('should update sortOrder', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        sortOrder: 0,
        project: { familyId: 'family-test-123' },
      };

      const updatedTask = {
        ...mockTask,
        sortOrder: 5,
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(updatedTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ sortOrder: 5 }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.task.sortOrder).toBe(5);
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful update', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Old Name',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockResolvedValue(mockTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
      });
      await PATCH(request, { params: { taskId: 'task-1' } });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_TASK_UPDATED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            taskId: 'task-1',
            updates: { name: 'New Name' },
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.update.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update task');
    });
  });
});

describe('DELETE /api/projects/tasks/[taskId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      auth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {
      auth.mockResolvedValue(mockChildSession());

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Task Deletion', () => {
    it('should return 404 if task does not exist', async () => {
      auth.mockResolvedValue(mockParentSession());
      prismaMock.projectTask.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Task not found');
    });

    it('should return 403 if task belongs to different family', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Test Task',
        project: { familyId: 'other-family-456' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should delete task successfully', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Test Task',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.delete.mockResolvedValue(mockTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Task deleted successfully');
      expect(prismaMock.projectTask.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful deletion', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Test Task',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.delete.mockResolvedValue(mockTask as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      await DELETE(request, { params: { taskId: 'task-1' } });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_TASK_DELETED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            taskId: 'task-1',
            name: 'Test Task',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {
      auth.mockResolvedValue(mockParentSession());

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Test Task',
        project: { familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);
      prismaMock.projectTask.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: { taskId: 'task-1' } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete task');
    });
  });
});
