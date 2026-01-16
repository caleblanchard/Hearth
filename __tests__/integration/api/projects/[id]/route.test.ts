// Set up mocks BEFORE any imports
import { prismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '@/app/api/projects/[id]/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage projects');
    });
  });

  describe('Project Retrieval', () => {
    it('should return project with all details', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Birthday Party',
        description: 'Plan birthday party',
        status: 'ACTIVE',
        startDate: new Date('2026-02-01'),
        dueDate: new Date('2026-02-15'),
        budget: 500,
        notes: 'For Sarah',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: {
          id: 'parent-test-123',
          name: 'Test Parent',
        },
        tasks: [
          {
            id: 'task-1',
            name: 'Book venue',
            status: 'COMPLETED',
          },
          {
            id: 'task-2',
            name: 'Send invitations',
            status: 'IN_PROGRESS',
          },
        ],
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.project.name).toBe('Birthday Party');
      expect(data.project.tasks).toHaveLength(2);
      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  dependencies: true,
                  dependents: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/nonexistent'),
        { params: Promise.resolve({ id: 'nonexistent' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 if project belongs to different family', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'different-family',
        name: 'Birthday Party',
        createdById: 'other-parent',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database query fails', async () => {
      prismaMock.project.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await GET(
        new NextRequest('http://localhost:3000/api/projects/project-1'),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch project');
    });
  });
});

describe('PATCH /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can update projects');
    });
  });

  describe('Validation', () => {
    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/nonexistent', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'nonexistent' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 if project belongs to different family', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'different-family',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 if name is empty string', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: '   ' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name cannot be empty');
    });

    it('should return 400 if status is invalid', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ status: 'INVALID_STATUS' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });

    it('should return 400 if budget is negative', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ budget: -100 }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Budget must be a positive number');
    });

    it('should return 400 if dueDate is before startDate', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        startDate: new Date('2026-02-01'),
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ dueDate: '2026-01-15' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Due date must be after start date');
    });
  });

  describe('Project Update', () => {
    it('should update project with partial data', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Original Name',
        status: 'ACTIVE',
      };

      const updatedProject = {
        ...mockProject,
        name: 'Updated Name',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.update.mockResolvedValue(updatedProject as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.project.name).toBe('Updated Name');
      expect(data.message).toBe('Project updated successfully');
    });

    it('should update all fields', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({
            name: 'Updated Name',
            description: 'Updated description',
            status: 'ON_HOLD',
            startDate: '2026-03-01',
            dueDate: '2026-03-15',
            budget: 1000,
            notes: 'Updated notes',
          }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(200);
      expect(prismaMock.project.update).toHaveBeenCalledWith({
        where: { id: 'project-1' },
        data: {
          name: 'Updated Name',
          description: 'Updated description',
          status: 'ON_HOLD',
          startDate: new Date('2026-03-01'),
          dueDate: new Date('2026-03-15'),
          budget: 1000,
          notes: 'Updated notes',
        },
      });
    });

    it('should trim whitespace from name', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.update.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: '  Updated Name  ' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(prismaMock.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Updated Name',
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log on successful update', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.update.mockResolvedValue(mockProject as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ status: 'COMPLETED' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_UPDATED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            updates: { status: 'COMPLETED' },
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database update fails', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.update.mockRejectedValue(new Error('Database error'));

      const response = await PATCH(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update project');
    });
  });
});

describe('DELETE /api/projects/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can delete projects');
    });
  });

  describe('Project Deletion', () => {
    it('should delete project successfully', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.delete.mockResolvedValue(mockProject as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Project deleted successfully');
      expect(prismaMock.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
    });

    it('should return 404 if project not found', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/nonexistent', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'nonexistent' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Project not found');
    });

    it('should return 403 if project belongs to different family', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'different-family',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Audit Logging', () => {
    it('should create audit log on successful deletion', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.delete.mockResolvedValue(mockProject as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_DELETED',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            name: 'Test Project',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database deletion fails', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.findUnique.mockResolvedValue(mockProject as any);
      prismaMock.project.delete.mockRejectedValue(new Error('Database error'));

      const response = await DELETE(
        new NextRequest('http://localhost:3000/api/projects/project-1', {
          method: 'DELETE',
        }),
        { params: Promise.resolve({ id: 'project-1' }) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete project');
    });
  });
});
