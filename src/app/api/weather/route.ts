import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { getWeatherForFamily } from '@/lib/data/weather';
import { logger } from '@/lib/logger';

/**
 * GET /api/weather
 *
 * Get weather forecast for family location
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const childAuth = authContext ? null : await authenticateChildSession();
    const deviceAuth = authContext || childAuth ? null : await authenticateDeviceSecret();

    const familyId = authContext?.activeFamilyId ?? childAuth?.familyId ?? deviceAuth?.familyId;
    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const weather = await getWeatherForFamily(familyId);

    return NextResponse.json(weather);
  } catch (error) {
    logger.error('Weather API error:', error);
    if (error instanceof Error) {
      if (error.message === 'Family location not configured') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'Weather API not configured') {
        return NextResponse.json(
          { error: error.message },
          { status: 503 }
        );
      }
      if (error.message === 'No weather data available') {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
      if (error.message === 'Failed to fetch weather data') {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch weather forecast' },
      { status: 500 }
    );
  }
}
