import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getProjectTemplates, createProjectFromTemplate } from '@/lib/data/projects';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage projects
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    const templates = await getProjectTemplates(familyId);

    return NextResponse.json({ templates });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can manage projects
    const isParent = await isParentInFamily( familyId);
    if (!isParent) {
      return NextResponse.json(
        { error: 'Only parents can manage projects' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { templateId, name } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const project = await createProjectFromTemplate(templateId, {
      familyId,
      title: name,
    });

    return NextResponse.json({
      success: true,
      project,
      message: 'Project created from template successfully',
    });
  } catch (error) {
    logger.error('Error creating project from template:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
