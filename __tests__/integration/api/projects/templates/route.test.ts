// Set up mocks BEFORE any imports
import { prismaMock } from '@/lib/test-utils/prisma-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/projects/templates/route';
import { mockParentSession, mockChildSession } from '@/lib/test-utils/auth-mock';

describe('GET /api/projects/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can manage projects');
    });
  });

  describe('Template Listing', () => {
    it('should return all available templates', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
      expect(data.templates.length).toBeGreaterThan(0);
    });

    it('should return templates with required fields', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates');
      const response = await GET(request);

      const data = await response.json();
      const template = data.templates[0];

      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('category');
      expect(template).toHaveProperty('estimatedDays');
      expect(template).toHaveProperty('suggestedBudget');
      expect(template).toHaveProperty('tasks');
      expect(Array.isArray(template.tasks)).toBe(true);
    });

    it('should include task dependencies in templates', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates');
      const response = await GET(request);

      const data = await response.json();
      const template = data.templates[0];

      expect(template.tasks.length).toBeGreaterThan(0);
      expect(template.tasks[0]).toHaveProperty('name');
      expect(template.tasks[0]).toHaveProperty('description');
      expect(template.tasks[0]).toHaveProperty('estimatedHours');
    });
  });
});

describe('POST /api/projects/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is a child', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only parents can create projects');
    });
  });

  describe('Validation', () => {
    it('should return 400 if templateId is missing', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Template ID is required');
    });

    it('should return 404 if template does not exist', async () => {

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'nonexistent-template' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Template not found');
    });
  });

  describe('Template Instantiation', () => {
    it('should create project from template with default values', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Birthday Party',
        description: 'Plan and execute a birthday party',
        status: 'ACTIVE',
        createdById: 'parent-test-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCompleteProject = {
        ...mockProject,
        tasks: [],
      };

      prismaMock.project.create.mockResolvedValue(mockProject as any);
      prismaMock.project.findUnique.mockResolvedValue(mockCompleteProject as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.taskDependency.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.project).toBeDefined();
      expect(data.project.name).toBe('Birthday Party');
      expect(data.message).toBe('Project created from template successfully');
    });

    it('should allow customizing project name', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: "Sarah's 10th Birthday",
        createdById: 'parent-test-123',
      };

      prismaMock.project.create.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'birthday-party',
          customizations: {
            name: "Sarah's 10th Birthday",
          },
        }),
      });
      await POST(request);

      expect(prismaMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "Sarah's 10th Birthday",
          }),
        })
      );
    });

    it('should allow customizing budget', async () => {

      prismaMock.project.create.mockResolvedValue({} as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'birthday-party',
          customizations: {
            budget: 1000,
          },
        }),
      });
      await POST(request);

      expect(prismaMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            budget: 1000,
          }),
        })
      );
    });

    it('should create all tasks from template', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
      };

      prismaMock.project.create.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      await POST(request);

      // Should create project
      expect(prismaMock.project.create).toHaveBeenCalledTimes(1);

      // Should create multiple tasks (birthday party template has several tasks)
      expect(prismaMock.projectTask.create).toHaveBeenCalled();
    });

    it('should set dates based on start date if provided', async () => {

      prismaMock.project.create.mockResolvedValue({} as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'birthday-party',
          customizations: {
            startDate: '2026-03-01',
          },
        }),
      });
      await POST(request);

      expect(prismaMock.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startDate: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Audit Logging', () => {
    it('should create an audit log entry on successful instantiation', async () => {

      const mockProject = {
        id: 'project-1',
        familyId: 'family-test-123',
        name: 'Birthday Party',
      };

      prismaMock.project.create.mockResolvedValue(mockProject as any);
      prismaMock.projectTask.create.mockResolvedValue({} as any);
      prismaMock.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      await POST(request);

      expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
        data: {
          familyId: 'family-test-123',
          memberId: 'parent-test-123',
          action: 'PROJECT_CREATED',
          result: 'SUCCESS',
          metadata: expect.objectContaining({
            projectId: 'project-1',
            templateId: 'birthday-party',
          }),
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 if database operation fails', async () => {
      prismaMock.project.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/projects/templates', {
        method: 'POST',
        body: JSON.stringify({ templateId: 'birthday-party' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create project from template');
    });
  });
});
