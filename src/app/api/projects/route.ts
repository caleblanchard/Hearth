import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, routeHandler } from '@/lib/api-route';
import {
  createProjectLifecycleProject,
  getProjectLifecycleProjects,
} from '@/lib/data/project-lifecycle';

export const GET = routeHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const projects = await getProjectLifecycleProjects({
      status: searchParams.get('status'),
    });
    return { projects, total: projects.length };
  },
  { errorMessage: 'Failed to fetch projects' }
);

export const POST = routeHandler(
  async (request: NextRequest) => {
    const body = await readJsonBody<Record<string, unknown>>(request);
    const project = await createProjectLifecycleProject(body);
    return NextResponse.json(
      {
        success: true,
        project,
        message: 'Project created successfully',
      },
      { status: 201 }
    );
  },
  { errorMessage: 'Failed to create project' }
);