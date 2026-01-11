import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/weather
 *
 * Get weather forecast for family location
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Get family location
    const { data: family } = await supabase
      .from('families')
      .select('id, name, location, latitude, longitude')
      .eq('id', familyId)
      .single();

    if (!family || !family.latitude || !family.longitude) {
      return NextResponse.json(
        { error: 'Family location not configured' },
        { status: 404 }
      );
    }

    // Call OpenWeatherMap API
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Weather API not configured' },
        { status: 503 }
      );
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${family.latitude}&lon=${family.longitude}&appid=${apiKey}&units=imperial`;
    const response = await fetch(url);

    if (!response.ok) {
      logger.error('Weather API error', { status: response.status });
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      location: family.location,
      forecast: data,
    });
  } catch (error) {
    logger.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather forecast' },
      { status: 500 }
    );
  }
}
