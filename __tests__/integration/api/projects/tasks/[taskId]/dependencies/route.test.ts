// Set up mocks BEFORE any imports
import { prismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { POST, DELETE } from '@/app/api/projects/tasks/[taskId]/dependencies/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('POST /api/projects/tasks/[taskId]/dependencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Validation', () => {
    it('should return 400 if blockingTaskId is missing', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Blocking task ID is required');
    });

    it('should return 400 if task tries to depend on itself', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-1' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('A task cannot depend on itself');
    });

    it('should return 404 if dependent task does not exist', async () => {
      prismaMock.projectTask.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Dependent task not found');
    });

    it('should return 403 if dependent task belongs to different family', async () => {

      const mockTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'other-family-456' },
      };

      prismaMock.projectTask.findUnique.mockResolvedValue(mockTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 404 if blocking task does not exist', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any) // First call for dependent task
        .mockResolvedValueOnce(null); // Second call for blocking task

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Blocking task not found');
    });

    it('should return 400 if tasks belong to different projects', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-2',
        project: { id: 'project-2', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Tasks must belong to the same project');
    });

    it('should return 400 if dependency already exists', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const existingDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(existingDependency as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Dependency already exists');
    });

    it('should return 400 if circular dependency is detected (direct)', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      // Task-2 already depends on Task-1, so Task-1 cannot depend on Task-2
      const reverseDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-2',
        blockingTaskId: 'task-1',
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst
        .mockResolvedValueOnce(null) // No existing dependency
        .mockResolvedValueOnce(reverseDependency as any); // Circular dependency exists

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Circular dependency detected');
    });

    it('should return 400 if circular dependency is detected (indirect)', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-3',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      // Task-1 → Task-2 → Task-3 already exists
      // So Task-1 → Task-3 would create a path that already exists
      const indirectDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        blockingTask: {
          id: 'task-2',
          dependencies: [
            {
              id: 'dep-2',
              dependentTaskId: 'task-2',
              blockingTaskId: 'task-3',
            },
          ],
        },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValueOnce(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([indirectDependency] as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-3' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Circular dependency detected');
    });
  });

  describe('Dependency Creation', () => {
    it('should create a task dependency successfully', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        name: 'Dependent Task',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        name: 'Blocking Task',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        dependencyType: 'FINISH_TO_START',
        createdAt: new Date(),
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([]);
      prismaMock.taskDependency.create.mockResolvedValue(mockDependency as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.dependency.dependentTaskId).toBe('task-1');
      expect(data.dependency.blockingTaskId).toBe('task-2');
      expect(data.message).toBe('Dependency created successfully');
    });

    it('should create dependency with custom type', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([]);
      prismaMock.taskDependency.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({
          blockingTaskId: 'task-2',
          dependencyType: 'START_TO_START',
        }),
      });
      await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(prismaMock.taskDependency.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dependencyType: 'START_TO_START',
          }),
        })
      );
    });

    it('should default to FINISH_TO_START if type not specified', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([]);
      prismaMock.taskDependency.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(prismaMock.taskDependency.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dependencyType: 'FINISH_TO_START',
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful dependency creation', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([]);
      prismaMock.taskDependency.create.mockResolvedValue(mockDependency as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_DEPENDENCY_ADDED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            dependencyId: 'dep-1',
            dependentTaskId: 'task-1',
            blockingTaskId: 'task-2',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {

      const mockDependentTask = {
        id: 'task-1',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      const mockBlockingTask = {
        id: 'task-2',
        projectId: 'project-1',
        project: { id: 'project-1', familyId: 'family-test-123' },
      };

      prismaMock.projectTask.findUnique
        .mockResolvedValueOnce(mockDependentTask as any)
        .mockResolvedValueOnce(mockBlockingTask as any);
      prismaMock.taskDependency.findFirst.mockResolvedValue(null);
      prismaMock.taskDependency.findMany.mockResolvedValue([]);
      prismaMock.taskDependency.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects/tasks/task-1/dependencies', {
        method: 'POST',
        body: JSON.stringify({ blockingTaskId: 'task-2' }),
      });
      const response = await POST(request, { params: Promise.resolve({ taskId: 'task-1' }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create dependency');
    });
  });
});

describe('DELETE /api/projects/tasks/[taskId]/dependencies/[dependencyId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage tasks');
    });
  });

  describe('Dependency Deletion', () => {
    it('should return 404 if dependency does not exist', async () => {
      prismaMock.taskDependency.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Dependency not found');
    });

    it('should return 403 if dependency belongs to different family', async () => {

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        dependentTask: {
          project: { id: 'project-1', familyId: 'other-family-456' },
        },
      };

      prismaMock.taskDependency.findUnique.mockResolvedValue(mockDependency as any);

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should delete dependency successfully', async () => {

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        dependentTask: {
          projectId: 'project-1',
          project: { id: 'project-1', familyId: 'family-test-123' },
        },
      };

      prismaMock.taskDependency.findUnique.mockResolvedValue(mockDependency as any);
      prismaMock.taskDependency.delete.mockResolvedValue(mockDependency as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Dependency deleted successfully');
      expect(prismaMock.taskDependency.delete).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
      });
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful deletion', async () => {

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        dependentTask: {
          projectId: 'project-1',
          project: { id: 'project-1', familyId: 'family-test-123' },
        },
      };

      prismaMock.taskDependency.findUnique.mockResolvedValue(mockDependency as any);
      prismaMock.taskDependency.delete.mockResolvedValue(mockDependency as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_DEPENDENCY_REMOVED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            dependencyId: 'dep-1',
            dependentTaskId: 'task-1',
            blockingTaskId: 'task-2',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {

      const mockDependency = {
        id: 'dep-1',
        dependentTaskId: 'task-1',
        blockingTaskId: 'task-2',
        dependentTask: {
          project: { id: 'project-1', familyId: 'family-test-123' },
        },
      };

      prismaMock.taskDependency.findUnique.mockResolvedValue(mockDependency as any);
      prismaMock.taskDependency.delete.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest(
        'http://localhost:3000/api/projects/tasks/task-1/dependencies/dep-1',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ taskId: 'task-1', dependencyId: 'dep-1' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete dependency');
    });
  });
});
