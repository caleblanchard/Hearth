import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProjectTasks, createProjectTask } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage projects
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    // Check if project exists and belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const tasks = await getProjectTasks(id);

    return NextResponse.json({ tasks });
  } catch (error) {
    logger.error('Get project tasks error:', error);
    return NextResponse.json({ error: 'Failed to get tasks' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage projects
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    // Check if project exists and belongs to family
    const { data: project } = await supabase
      .from('projects')
      .select('family_id')
      .eq('id', id)
      .single();

    if (!project || project.family_id !== familyId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const task = await createProjectTask(id, body);

    return NextResponse.json({
      success: true,
      task,
      message: 'Task created successfully',
    });
  } catch (error) {
    logger.error('Create project task error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
