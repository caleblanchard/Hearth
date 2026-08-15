import { NextRequest, NextResponse } from 'next/server';
import {
  createProjectLifecycleProjectFromTemplate,
  getProjectLifecycleTemplates,
} from '@/lib/data/project-lifecycle';
import { readJsonBody, routeHandler } from '@/lib/api-route';

export const GET = routeHandler(async () => {
  const templates = await getProjectLifecycleTemplates();
  return { templates };
}, { errorMessage: 'Failed to fetch templates' });

export const POST = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const project = await createProjectLifecycleProjectFromTemplate(body);
  return NextResponse.json(
    {
      success: true,
      project,
      message: 'Project created from template successfully',
    },
    { status: 201 }
  );
}, { errorMessage: 'Failed to create project from template' });