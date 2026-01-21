import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
import { GET as GetTransport } from '@/app/api/transport/today/route';
import { GET as GetMedications } from '@/app/api/medications/route';
import { GET as GetMaintenance } from '@/app/api/maintenance/upcoming/route';
import { GET as GetInventory } from '@/app/api/inventory/low-stock/route';
import { GET as GetWeather } from '@/app/api/weather/route';

const VALID_WIDGETS = [
  'transport',
  'medication',
  'maintenance',
  'inventory',
  'weather',
];

type WidgetHandler = (req: NextRequest) => Promise<NextResponse>;

const WIDGET_HANDLERS: Record<string, WidgetHandler> = {
  transport: GetTransport,
  medication: GetMedications,
  maintenance: GetMaintenance,
  inventory: GetInventory,
  weather: GetWeather,
};

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const childAuth = authContext ? null : await authenticateChildSession();
    const deviceAuth = authContext || childAuth ? null : await authenticateDeviceSecret();

    if (!authContext && !childAuth && !deviceAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const widgets = [
      ...searchParams.getAll('widgets[]'),
      ...searchParams.getAll('widgets'),
    ].filter(Boolean);

    if (widgets.length === 0) {
      return NextResponse.json({ error: 'No widgets specified' }, { status: 400 });
    }

    const invalidWidgets = widgets.filter((widget) => !VALID_WIDGETS.includes(widget));
    if (invalidWidgets.length > 0) {
      return NextResponse.json({ error: 'Invalid widget names' }, { status: 400 });
    }

    const results = await Promise.all(
      widgets.map(async (widget) => {
        const handler = WIDGET_HANDLERS[widget];
        if (!handler) {
          return { widget, success: false, error: 'Widget handler not found' };
        }
        try {
          const response = await handler(request);
          const data = await response.json();
          return {
            widget,
            success: response.status >= 200 && response.status < 300,
            data,
            error: response.status >= 200 && response.status < 300 ? undefined : data?.error || 'Widget fetch failed',
          };
        } catch (error) {
          return { widget, success: false, error: 'Widget fetch failed' };
        }
      })
    );

    const payload: Record<string, unknown> = {};
    results.forEach((result) => {
      const { widget, success, data, error } = result as any;
      payload[widget] = {
        success,
        ...(success ? { data } : { error }),
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    logger.error('Widget data error:', error);
    return NextResponse.json({ error: 'Failed to fetch widget data' }, { status: 500 });
  }
}
