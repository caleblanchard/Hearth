import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthContext } from '@/lib/supabase/server';
import { getEnabledModules } from '@/lib/data/settings';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const enabledModules = await getEnabledModules(familyId);
    const activeMemberId = authContext.activeMemberId;

    if (activeMemberId) {
      const supabase = await createClient();
      const { data: member } = await supabase
        .from('family_members')
        .select('role')
        .eq('id', activeMemberId)
        .single();

      if (member?.role === 'CHILD') {
        const { data: accessRows } = await supabase
          .from('member_module_access')
          .select('module_id, has_access')
          .eq('member_id', activeMemberId);

        if (accessRows && accessRows.length > 0) {
          const allowedModules = new Set(
            accessRows.filter((row) => row.has_access).map((row) => row.module_id)
          );
          return NextResponse.json({
            enabledModules: enabledModules.filter((moduleId) => allowedModules.has(moduleId)),
          });
        }
      }
    }

    return NextResponse.json({ enabledModules });
  } catch (error) {
    logger.error('Get enabled modules error:', error);
    return NextResponse.json({ error: 'Failed to get enabled modules' }, { status: 500 });
  }
}
