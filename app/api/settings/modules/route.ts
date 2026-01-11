import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getModuleConfigurations, updateModuleConfiguration } from '@/lib/data/settings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
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

    // Only parents can view module configurations
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const modules = await getModuleConfigurations(familyId);

    return NextResponse.json({ modules });
  } catch (error) {
    logger.error('Get module configurations error:', error);
    return NextResponse.json({ error: 'Failed to get module configurations' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Only parents can update module configurations
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const { moduleId, isEnabled } = body;

    if (!moduleId) {
      return NextResponse.json({ error: 'Module ID is required' }, { status: 400 });
    }

    const result = await updateModuleConfiguration(familyId, moduleId, isEnabled);

    return NextResponse.json({
      success: true,
      module: result,
      message: 'Module configuration updated successfully',
    });
  } catch (error) {
    logger.error('Update module configuration error:', error);
    return NextResponse.json({ error: 'Failed to update module configuration' }, { status: 500 });
  }
}
