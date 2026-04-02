import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getAuthContext } from '@/lib/supabase/server';
import { authenticateChildSession, authenticateDeviceSecret } from '@/lib/kiosk-auth';
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

    // Use service client for kiosk/device flows (child role has no auth UID for RLS)
    const supabase =
      authContext && authContext.user?.role !== 'CHILD'
        ? await createClient()
        : createServiceClient();

    const familyId = authContext?.activeFamilyId ?? childAuth?.familyId ?? deviceAuth?.familyId;
    if (!familyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${family.latitude}&lon=${family.longitude}&appid=${apiKey}&units=imperial`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${family.latitude}&lon=${family.longitude}&appid=${apiKey}&units=imperial`;

    const currentResponse = await fetch(currentUrl);
    if (!currentResponse.ok) {
      logger.error('Weather API error', { status: currentResponse.status });
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      );
    }

    const forecastResponse = await fetch(forecastUrl);
    if (!forecastResponse.ok) {
      logger.error('Weather API error', { status: forecastResponse.status });
      return NextResponse.json(
        { error: 'Failed to fetch weather data' },
        { status: 500 }
      );
    }

    const currentData = await currentResponse.json();
    const data = await forecastResponse.json();

    // Transform OpenWeatherMap forecast data
    // The API returns 3-hour intervals for 5 days
    const list = data.list || [];
    
    if (list.length === 0) {
      return NextResponse.json(
        { error: 'No weather data available' },
        { status: 404 }
      );
    }

    // Get current weather (first forecast entry)
    const current = list[0];
    
    // Get today's high/low
    const today = new Date().toDateString();
    const todayForecasts = list.filter((item: any) => {
      const itemDate = new Date(item.dt * 1000).toDateString();
      return itemDate === today;
    });
    
    const todayTemps = todayForecasts.map((f: any) => f.main.temp);
    const todayHigh = todayTemps.length > 0 ? Math.round(Math.max(...todayTemps)) : Math.round(current.main.temp_max);
    const todayLow = todayTemps.length > 0 ? Math.round(Math.min(...todayTemps)) : Math.round(current.main.temp_min);

    // Get forecast for next 3 days (taking noon forecast for each day)
    const dailyForecasts: any[] = [];
    const processedDates = new Set<string>();
    
    for (const item of list) {
      const itemDate = new Date(item.dt * 1000);
      const dateString = itemDate.toDateString();
      
      // Skip today and already processed dates
      if (dateString === today || processedDates.has(dateString)) {
        continue;
      }
      
      // Get noon forecast (12:00) or closest to it
      const hour = itemDate.getHours();
      if (hour >= 11 && hour <= 13) {
        dailyForecasts.push({
          date: itemDate.toISOString(),
          high: Math.round(item.main.temp_max),
          low: Math.round(item.main.temp_min),
          condition: item.weather[0].main,
          description: item.weather[0].description,
          icon: item.weather[0].icon,
        });
        processedDates.add(dateString);
        
        if (dailyForecasts.length >= 3) break;
      }
    }

    return NextResponse.json({
      location: family.location,
      current: {
        temp: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        condition: currentData.weather[0].main,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
      },
      today: {
        high: todayHigh,
        low: todayLow,
      },
      forecast: dailyForecasts,
    });
  } catch (error) {
    logger.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather forecast' },
      { status: 500 }
    );
  }
}
