import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

/**
 * GET /api/dashboard/widgets
 *
 * Aggregated endpoint for dashboard widget data
 * Query params: widgets[] (array of widget names)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication (regular session or kiosk token)
    const session = await auth();
    const kioskToken = request.headers.get('X-Kiosk-Token');

    let familyId: string | undefined;
    let memberId: string | undefined;

    if (session && session.user) {
      // Regular authenticated session
      familyId = session.user.familyId;
      memberId = session.user.id;
    } else if (kioskToken) {
      // Kiosk session authentication
      const kioskSession = await getKioskSession(kioskToken);
      if (kioskSession && kioskSession.isActive) {
        familyId = kioskSession.familyId;
        memberId = kioskSession.currentMemberId || undefined;
      }
    }

    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse widgets parameter
    const { searchParams } = new URL(request.url);
    const widgetsParam = searchParams.getAll('widgets[]');

    if (!widgetsParam || widgetsParam.length === 0) {
      return NextResponse.json(
        { error: 'No widgets specified' },
        { status: 400 }
      );
    }

    // Validate widget names
    const invalidWidgets = widgetsParam.filter(
      (widget) => !VALID_WIDGETS.includes(widget)
    );
    if (invalidWidgets.length > 0) {
      return NextResponse.json(
        { error: 'Invalid widget names' },
        { status: 400 }
      );
    }

    // Fetch widget data in parallel
    const widgetPromises = widgetsParam.map(async (widget) => {
      try {
        const handler = WIDGET_HANDLERS[widget];
        if (!handler) {
          return {
            widget,
            success: false,
            error: `Handler not found for ${widget}`,
          };
        }

        // Create a new request with kiosk token if present
        const widgetRequest = new NextRequest(request.url, {
          headers: kioskToken
            ? { 'X-Kiosk-Token': kioskToken }
            : undefined,
        });

        const response = await handler(widgetRequest);

        // Check if response status is successful (2xx)
        if (response.status < 200 || response.status >= 300) {
          return {
            widget,
            success: false,
            error: `Failed to fetch ${widget} data`,
          };
        }

        const data = await response.json();
        return {
          widget,
          success: true,
          data,
        };
      } catch (error) {
        logger.error(`Error fetching ${widget} widget`, error);
        return {
          widget,
          success: false,
          error: `Failed to fetch ${widget} data`,
        };
      }
    });

    const results = await Promise.allSettled(widgetPromises);

    // Transform results into aggregated response
    const aggregated: Record<string, any> = {};
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { widget, success, data, error } = result.value;
        aggregated[widget] = success
          ? { success: true, data }
          : { success: false, error };
      } else {
        // Promise was rejected
        logger.error('Widget promise rejected', result.reason);
      }
    });

    return NextResponse.json(aggregated);
  } catch (error) {
    logger.error('Error fetching dashboard widgets', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard widgets' },
      { status: 500 }
    );
  }
}
