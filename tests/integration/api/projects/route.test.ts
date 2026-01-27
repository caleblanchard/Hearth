// Set up mocks BEFORE any imports
import { dbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage projects');
    });
  });

  describe('Project Listing', () => {
    it('should return all projects for the family', async () => {

      const mockProjects = [
        {
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
            name: 'Parent User',
          },
          _count: {
            tasks: 5,
          },
        },
        {
          id: 'project-2',
          familyId: 'family-test-123',
          name: 'Vacation Planning',
          description: 'Summer vacation',
          status: 'IN_PROGRESS',
          startDate: new Date('2026-06-01'),
          dueDate: new Date('2026-07-01'),
          budget: 3000,
          notes: null,
          createdById: 'parent-test-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: 'parent-test-123',
            name: 'Parent User',
          },
          _count: {
            tasks: 12,
          },
        },
      ];

      dbMock.project.findMany.mockResolvedValue(mockProjects as any);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toHaveLength(2);
      expect(data.projects[0].name).toBe('Birthday Party');
      expect(data.projects[1].name).toBe('Vacation Planning');
      expect(dbMock.project.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-test-123' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          tasks: {
            select: {
              id: true,
              name: true,
              status: true,
              dueDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter projects by status', async () => {

      const mockProjects = [
        {
          id: 'project-1',
          familyId: 'family-test-123',
          name: 'Birthday Party',
          status: 'ACTIVE',
          createdById: 'parent-test-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'parent-test-123', name: 'Parent User' },
          _count: { tasks: 5 },
        },
      ];

      dbMock.project.findMany.mockResolvedValue(mockProjects as any);

      const request = new NextRequest('http://localhost:3000/api/projects?status=ACTIVE');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(dbMock.project.findMany).toHaveBeenCalledWith({
        where: {
          familyId: 'family-test-123',
          status: 'ACTIVE',
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          tasks: {
            select: {
              id: true,
              name: true,
              status: true,
              dueDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no projects exist', async () => {
      dbMock.project.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toEqual([]);
    });

    it('should only return projects for the user family', async () => {
      dbMock.project.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/projects');
      await GET(request);

      expect(dbMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            familyId: 'family-test-123',
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database query fails', async () => {
      dbMock.project.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch projects');
    });
  });
});

describe('POST /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can create projects');
    });
  });

  describe('Validation', () => {
    it('should return 400 if name is missing', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test description',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 if name is empty string', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: '   ',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Name is required');
    });

    it('should return 400 if status is invalid', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          status: 'INVALID_STATUS',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid status');
    });

    it('should return 400 if budget is negative', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          budget: -100,
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Budget must be a positive number');
    });

    it('should return 400 if dueDate is before startDate', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
          startDate: '2026-02-01',
          dueDate: '2026-01-15',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Due date must be after start date');
    });
  });

  describe('Project Creation', () => {
    it('should create a project with minimal data', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
        description: null,
        status: 'ACTIVE',
        startDate: null,
        dueDate: null,
        budget: null,
        notes: null,
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.project.create.mockResolvedValue(mockProject as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.project.name).toBe('Test Project');
      expect(data.project.status).toBe('ACTIVE');
      expect(data.message).toBe('Project created successfully');

      expect(dbMock.project.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          name: 'Test Project',
          description: null,
          status: 'ACTIVE',
          startDate: null,
          dueDate: null,
          budget: null,
          createdById: 'parent-test-123',
        },
      });
    });

    it('should create a project with all fields', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Birthday Party',
        description: 'Plan 10th birthday party',
        status: 'ACTIVE',
        startDate: new Date('2026-02-01'),
        dueDate: new Date('2026-02-15'),
        budget: 500,
        notes: 'Invite 20 kids',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.project.create.mockResolvedValue(mockProject as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Birthday Party',
          description: 'Plan 10th birthday party',
          status: 'ACTIVE',
          startDate: '2026-02-01',
          dueDate: '2026-02-15',
          budget: 500,
          notes: 'Invite 20 kids',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.project.name).toBe('Birthday Party');
      expect(data.project.budget).toBe(500);
    });

    it('should trim whitespace from name', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
        status: 'ACTIVE',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.project.create.mockResolvedValue(mockProject as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: '  Test Project  ',
        }),
      });
      await POST(request);

      expect(dbMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Project',
          }),
        })
      );
    });

    it('should default status to ACTIVE if not provided', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
        status: 'ACTIVE',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.project.create.mockResolvedValue(mockProject as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      await POST(request);

      expect(dbMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful project creation', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Test Project',
        status: 'ACTIVE',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      dbMock.project.create.mockResolvedValue(mockProject as any);
      dbMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      await POST(request);

      expect(dbMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_CREATED',
          entityId: 'project-1',
          entityType: 'PROJECT',
          result: 'SUCCESS',
          metadata: {
            projectId: 'project-1',
            name: 'Test Project',
            status: 'ACTIVE',
          },
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {
      dbMock.project.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Project',
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create project');
    });
  });
});
