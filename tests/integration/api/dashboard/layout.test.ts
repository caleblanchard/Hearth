// Set up mocks BEFORE any imports
import { dbMock, resetDbMock } from '@/lib/test-utils/db-mock';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// NOW import the route after mocks are set up
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/dashboard/layout/route';
import { POST } from '@/app/api/dashboard/layout/reset/route';
import { mockChildSession, mockParentSession } from '@/lib/test-utils/auth-mock';
import { ModuleId, Role } from '@/lib/enums';

describe('/api/dashboard/layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDbMock();
    
    // Mock family member lookup for enabled modules check
    dbMock.familyMember.findUnique.mockResolvedValue({
      id: 'member-1',
      family_id: 'family-1',
      auth_user_id: 'user-1'
    } as any);
    dbMock.familyMember.findFirst.mockResolvedValue({
      id: 'member-1',
      family_id: 'family-1',
      auth_user_id: 'user-1'
    } as any);
    
    // Default: no layout exists (needed for getDashboardLayout as maybeSingle uses findFirst via bridge)
    dbMock.dashboardLayout.findFirst.mockResolvedValue(null);
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/dashboard/layout');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return default layout when user has no saved layout', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      // Mock no existing layout
      dbMock.dashboardLayout.findUnique.mockResolvedValue(null);

      // Mock enabled modules
      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.SCREEN_TIME, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.CREDITS, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const request = new NextRequest('http://localhost/api/dashboard/layout');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.layout).toBeDefined();
      expect(data.layout.widgets).toBeInstanceOf(Array);
      expect(data.layout.widgets.length).toBeGreaterThan(0);
      expect(data.layout.availableWidgets).toBeInstanceOf(Array);

      // Verify default widgets are enabled and ordered
      const choreWidget = data.layout.widgets.find((w: any) => w.id === 'chores');
      expect(choreWidget).toBeDefined();
      expect(choreWidget.enabled).toBe(true);
      expect(choreWidget.order).toBeGreaterThanOrEqual(0);
    });

    it('should return saved layout when user has preferences', async () => {
      const session = mockParentSession({
        user: {
          id: 'parent-1',
          familyId: 'family-1',
          role: Role.PARENT,
          name: 'Test Parent',
          email: 'parent@test.com',
          familyName: 'Test Family',
        },
      });

      const savedLayout = {
        widgets: [
          {
            id: 'calendar',
            enabled: true,
            order: 0,
            size: 'default',
            settings: {},
          },
          {
            id: 'chores',
            enabled: true,
            order: 1,
            size: 'default',
            settings: {},
          },
          {
            id: 'todos',
            enabled: false,
            order: 2,
            size: 'default',
            settings: {},
          },
        ],
      };

      dbMock.dashboardLayout.findUnique.mockResolvedValue({
        id: 'layout-1',
        memberId: 'parent-1',
        layout: savedLayout,
        widgets: savedLayout.widgets, // Mock the widgets column which exists in DB
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      // Also mock findFirst because bridge maps maybeSingle to findFirst (since no unique constraint configured)
      dbMock.dashboardLayout.findFirst.mockResolvedValue({
        id: 'layout-1',
        memberId: 'parent-1',
        layout: savedLayout,
        widgets: savedLayout.widgets, // Mock the widgets column which exists in DB
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.CALENDAR, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.TODOS, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const request = new NextRequest('http://localhost/api/dashboard/layout');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have the 3 saved widgets plus weather (which has no module requirement)
      expect(data.layout.widgets.length).toBeGreaterThanOrEqual(3);
      expect(data.layout.widgets[0].id).toBe('calendar');
      expect(data.layout.widgets[1].id).toBe('chores');
      expect(data.layout.widgets[2].id).toBe('todos');
      expect(data.layout.widgets[2].enabled).toBe(false);
    });

    it('should filter out widgets for disabled modules', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      const savedLayout = {
        widgets: [
          { id: 'chores', enabled: true, order: 0, size: 'default' },
          { id: 'shopping', enabled: true, order: 1, size: 'default' },
        ],
      };

      dbMock.dashboardLayout.findUnique.mockResolvedValue({
        id: 'layout-1',
        memberId: 'child-1',
        layout: savedLayout,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Shopping module is disabled
      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const request = new NextRequest('http://localhost/api/dashboard/layout');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Shopping widget should be filtered out
      expect(data.layout.widgets.some((w: any) => w.id === 'shopping')).toBe(false);
      expect(data.layout.widgets.some((w: any) => w.id === 'chores')).toBe(true);
    });
  });

  describe('PUT', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/dashboard/layout', {
        method: 'PUT',
        body: JSON.stringify({ widgets: [] }),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should create new layout for user', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      const newLayout = {
        widgets: [
          { id: 'chores', enabled: true, order: 0, size: 'default' },
          { id: 'screentime', enabled: true, order: 1, size: 'default' },
        ],
      };

      dbMock.dashboardLayout.findUnique.mockResolvedValue(null);
      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.SCREEN_TIME, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      dbMock.dashboardLayout.upsert.mockResolvedValue({
        id: 'layout-1',
        memberId: 'child-1',
        layout: newLayout,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const request = new NextRequest('http://localhost/api/dashboard/layout', {
        method: 'PUT',
        body: JSON.stringify(newLayout),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(dbMock.dashboardLayout.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { memberId: 'child-1' },
        create: expect.objectContaining({
          memberId: 'child-1',
          layout: newLayout,
          widgets: newLayout.widgets,
        }),
        update: expect.objectContaining({
          layout: newLayout,
          widgets: newLayout.widgets,
        }),
      }));
    });

    it('should update existing layout for user', async () => {
      const session = mockParentSession({
        user: {
          id: 'parent-1',
          familyId: 'family-1',
          role: Role.PARENT,
          name: 'Test Parent',
          email: 'parent@test.com',
          familyName: 'Test Family',
        },
      });

      const existingLayout = {
        id: 'layout-1',
        memberId: 'parent-1',
        layout: {
          widgets: [{ id: 'chores', enabled: true, order: 0, size: 'default' }],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedLayout = {
        widgets: [
          { id: 'calendar', enabled: true, order: 0, size: 'default' },
          { id: 'chores', enabled: true, order: 1, size: 'default' },
        ],
      };

      dbMock.dashboardLayout.findUnique.mockResolvedValue(existingLayout as any);
      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.CALENDAR, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      dbMock.dashboardLayout.upsert.mockResolvedValue({
        ...existingLayout,
        layout: updatedLayout,
      } as any);

      const request = new NextRequest('http://localhost/api/dashboard/layout', {
        method: 'PUT',
        body: JSON.stringify(updatedLayout),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(dbMock.dashboardLayout.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { memberId: 'parent-1' },
        create: expect.objectContaining({
          memberId: 'parent-1',
          layout: updatedLayout,
        }),
        update: expect.objectContaining({
          layout: updatedLayout,
        }),
      }));
    });

    it('should reject invalid widget IDs', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const invalidLayout = {
        widgets: [
          { id: 'invalid-widget', enabled: true, order: 0, size: 'default' },
        ],
      };

      const request = new NextRequest('http://localhost/api/dashboard/layout', {
        method: 'PUT',
        body: JSON.stringify(invalidLayout),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should reject widgets for disabled modules', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      // Only CHORES is enabled
      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const layoutWithDisabledModule = {
        widgets: [
          { id: 'chores', enabled: true, order: 0, size: 'default' },
          { id: 'shopping', enabled: true, order: 1, size: 'default' }, // SHOPPING not enabled
        ],
      };

      const request = new NextRequest('http://localhost/api/dashboard/layout', {
        method: 'PUT',
        body: JSON.stringify(layoutWithDisabledModule),
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not available');
    });
  });

  describe('POST /reset', () => {
    it('should return 401 if not authenticated', async () => {

      const request = new NextRequest('http://localhost/api/dashboard/layout/reset', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should delete user layout and return default', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      dbMock.dashboardLayout.deleteMany.mockResolvedValue({ count: 1 } as any);
      // Mock findFirst/Unique for getDashboardLayout call inside reset
      dbMock.dashboardLayout.findUnique.mockResolvedValue(null);
      dbMock.dashboardLayout.findFirst.mockResolvedValue(null);

      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
        { module_id: ModuleId.SCREEN_TIME, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const request = new NextRequest('http://localhost/api/dashboard/layout/reset', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.layout).toBeDefined();
      expect(data.layout.widgets).toBeInstanceOf(Array);
      expect(dbMock.dashboardLayout.deleteMany).toHaveBeenCalledWith({
        where: { memberId: 'child-1' },
      });
    });

    it('should succeed even if no layout exists', async () => {
      const session = mockChildSession({
        user: {
          id: 'child-1',
          familyId: 'family-1',
          role: Role.CHILD,
          name: 'Test Child',
          email: null,
          familyName: 'Test Family',
        },
      });

      // Simulate no layout to delete
      dbMock.dashboardLayout.delete.mockRejectedValue(new Error('Not found'));

      dbMock.moduleConfiguration.findMany.mockResolvedValue([
        { module_id: ModuleId.CHORES, is_enabled: true, family_id: 'family-1' } as any,
      ]);

      const request = new NextRequest('http://localhost/api/dashboard/layout/reset', {
        method: 'POST',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.layout).toBeDefined();
    });
  });
});
