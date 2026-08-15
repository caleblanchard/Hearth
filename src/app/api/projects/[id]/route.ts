import { NextRequest } from 'next/server';
import {
  deleteProjectLifecycleProject,
  getProjectLifecycleProject,
  updateProjectLifecycleProject,
} from '@/lib/data/project-lifecycle';
import { readJsonBody, routeHandler, type RouteContext } from '@/lib/api-route';

export const GET = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const project = await getProjectLifecycleProject(id);
    return { project };
  },
  { errorMessage: 'Failed to fetch project' }
);

export const PATCH = routeHandler(
  async (request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    const body = await readJsonBody<Record<string, unknown>>(request);
    const project = await updateProjectLifecycleProject(id, body);
    return {
      success: true,
      project,
      message: 'Project updated successfully',
    };
  },
  { errorMessage: 'Failed to update project' }
);

export const DELETE = routeHandler(
  async (_request: NextRequest, { params }: RouteContext) => {
    const { id } = await params;
    await deleteProjectLifecycleProject(id);
    return {
      success: true,
      message: 'Project deleted successfully',
    };
  },
  { errorMessage: 'Failed to delete project' }
);