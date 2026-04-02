import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthContext } from '@/lib/supabase/server';
import { getEnabledModules } from '@/lib/data/settings';
import { logger } from '@/lib/logger';

const CHILD_DEFAULT_MODULES = new Set<string>([
  'CHORES',
  'SCREEN_TIME',
  'CREDITS',
  'SHOPPING',
  'CALENDAR',
  'TODOS',
]);

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
    const activeMemberId = authContext.activeMemberId || authContext.user?.id || null;

    if (activeMemberId) {
      const supabase = await createClient();
      const { data: member } = await supabase
        .from('family_members')
        .select('role')
        .eq('id', activeMemberId)
        .maybeSingle();

      const isChild = member?.role === 'CHILD' || authContext.user?.role === 'CHILD';

      if (isChild) {
        const { data: accessRows, error: accessError } = await supabase
          .from('member_module_access')
          .select('module_id, has_access')
          .eq('member_id', activeMemberId);

        if (accessError) {
          return NextResponse.json({ error: 'Failed to get module access' }, { status: 500 });
        }

        if (accessRows && accessRows.length > 0) {
          const allowedModules = new Set(
            accessRows.filter((row) => row.has_access).map((row) => row.module_id)
          );
          const filtered = enabledModules.filter((moduleId) => allowedModules.has(moduleId));
          return NextResponse.json({ enabledModules: filtered });
        }
        // No explicit rows: fall back to child-safe defaults intersecting family enabled modules
        const fallback = enabledModules.filter((moduleId) => CHILD_DEFAULT_MODULES.has(moduleId));
        return NextResponse.json({ enabledModules: fallback });
      }
    }

    return NextResponse.json({ enabledModules });
  } catch (error) {
    logger.error('Get enabled modules error:', error);
    return NextResponse.json({ error: 'Failed to get enabled modules' }, { status: 500 });
  }
}
