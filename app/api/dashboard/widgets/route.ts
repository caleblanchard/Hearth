import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getKioskSession } from '@/lib/kiosk-session';
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

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const widget = searchParams.get('widget');

    if (!widget) {
      return NextResponse.json({ error: 'Widget parameter is required' }, { status: 400 });
    }

    if (!VALID_WIDGETS.includes(widget)) {
      return NextResponse.json({ error: 'Invalid widget type' }, { status: 400 });
    }

    const handler = WIDGET_HANDLERS[widget];
    if (!handler) {
      return NextResponse.json({ error: 'Widget handler not found' }, { status: 404 });
    }

    return await handler(request);
  } catch (error) {
    logger.error('Widget data error:', error);
    return NextResponse.json({ error: 'Failed to fetch widget data' }, { status: 500 });
  }
}
