import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { buildDashboardWidgetCollection } from '@/lib/data/dashboard-widget-collection';
import { logger } from '@/lib/logger';
import {
  DASHBOARD_WIDGET_KINDS,
  isDashboardWidgetKind,
} from '@/types/dashboard-widget-collection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const childAuth = authContext ? null : await authenticateChildSession();
    const deviceAuth = authContext || childAuth ? null : await authenticateDeviceSecret();

    if (!authContext && !childAuth && !deviceAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedWidgets = [
      ...searchParams.getAll('widgets[]'),
      ...searchParams.getAll('widgets'),
    ].filter(Boolean);

    if (requestedWidgets.length === 0) {
      return NextResponse.json({ error: 'No widgets specified' }, { status: 400 });
    }

    const invalidWidgets = requestedWidgets.filter(
      (widget) => !DASHBOARD_WIDGET_KINDS.includes(widget as any)
    );
    if (invalidWidgets.length > 0) {
      return NextResponse.json({ error: 'Invalid widget names' }, { status: 400 });
    }

    const widgets = requestedWidgets.filter(isDashboardWidgetKind);
    const familyId = authContext?.activeFamilyId ?? childAuth?.familyId ?? deviceAuth?.familyId;
    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId =
      searchParams.get('memberId') ??
      childAuth?.memberId ??
      authContext?.activeMemberId ??
      undefined;

    const payload = await buildDashboardWidgetCollection(
      {
        familyId,
        memberId,
      },
      widgets
    );

    return NextResponse.json(payload);
  } catch (error) {
    logger.error('Widget data error:', error);
    return NextResponse.json({ error: 'Failed to fetch widget data' }, { status: 500 });
  }
}
