import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/weather
 *
 * Get weather forecast for family location
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get family location
    const family = await prisma.family.findUnique({
      where: { id: session.user.familyId },
      select: {
        id: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!family || !family.latitude || !family.longitude) {
      return NextResponse.json(
        { error: 'Family location not configured' },
        { status: 404 }
      );
    }

    // Call OpenWeatherMap API
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      logger.error('WEATHER_API_KEY not configured');
      return NextResponse.json(
        { error: 'Weather service not configured' },
        { status: 500 }
      );
    }

    // Use free Current Weather API + 5-day forecast API
    // First, get current weather
    const currentUrl = new URL('https://api.openweathermap.org/data/2.5/weather');
    currentUrl.searchParams.append('lat', family.latitude.toString());
    currentUrl.searchParams.append('lon', family.longitude.toString());
    currentUrl.searchParams.append('units', 'imperial');
    currentUrl.searchParams.append('appid', apiKey);

    const currentResponse = await fetch(currentUrl.toString());

    if (!currentResponse.ok) {
      const errorText = await currentResponse.text();
      logger.error('OpenWeatherMap API error', {
        status: currentResponse.status,
        statusText: currentResponse.statusText,
        error: errorText,
        familyId: family.id,
      });
      return NextResponse.json(
        { error: `Failed to fetch weather data: ${currentResponse.statusText}` },
        { status: 500 }
      );
    }

    const currentData = await currentResponse.json();

    // Get 5-day forecast
    const forecastUrl = new URL('https://api.openweathermap.org/data/2.5/forecast');
    forecastUrl.searchParams.append('lat', family.latitude.toString());
    forecastUrl.searchParams.append('lon', family.longitude.toString());
    forecastUrl.searchParams.append('units', 'imperial');
    forecastUrl.searchParams.append('appid', apiKey);

    const forecastResponse = await fetch(forecastUrl.toString());

    if (!forecastResponse.ok) {
      logger.error('OpenWeatherMap Forecast API error', {
        status: forecastResponse.status,
        familyId: family.id,
      });
      // Continue with just current weather if forecast fails
    }

    const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;

    // Calculate today's high/low from forecast data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todayHigh = currentData.main.temp;
    let todayLow = currentData.main.temp;

    if (forecastData) {
      const todayForecasts = forecastData.list.filter((item: any) => {
        const itemDate = new Date(item.dt * 1000);
        return itemDate >= today && itemDate < tomorrow;
      });

      if (todayForecasts.length > 0) {
        todayHigh = Math.max(...todayForecasts.map((item: any) => item.main.temp_max));
        todayLow = Math.min(...todayForecasts.map((item: any) => item.main.temp_min));
      }
    }

    // Get forecast for next 3 days
    const forecast: any[] = [];
    if (forecastData) {
      // Group forecast by day and get daily high/low
      const dailyForecasts: { [key: string]: any[] } = {};
      
      forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        if (!dailyForecasts[dateKey]) {
          dailyForecasts[dateKey] = [];
        }
        dailyForecasts[dateKey].push(item);
      });

      // Get next 3 days (excluding today)
      const forecastDays = Object.keys(dailyForecasts)
        .filter(key => {
          const dayDate = new Date(key);
          return dayDate > today;
        })
        .sort()
        .slice(0, 3);

      forecastDays.forEach((dateKey) => {
        const dayItems = dailyForecasts[dateKey];
        const high = Math.max(...dayItems.map((item: any) => item.main.temp_max));
        const low = Math.min(...dayItems.map((item: any) => item.main.temp_min));
        const representativeItem = dayItems[Math.floor(dayItems.length / 2)]; // Middle of the day

        forecast.push({
          date: new Date(dateKey).toISOString(),
          high: Math.round(high),
          low: Math.round(low),
          condition: representativeItem.weather[0].main,
          description: representativeItem.weather[0].description,
          icon: representativeItem.weather[0].icon,
        });
      });
    }

    // Transform response to simpler format
    const result = {
      location: family.location || currentData.name,
      current: {
        temp: Math.round(currentData.main.temp),
        feelsLike: Math.round(currentData.main.feels_like),
        humidity: currentData.main.humidity,
        condition: currentData.weather[0].main,
        description: currentData.weather[0].description,
        icon: currentData.weather[0].icon,
      },
      today: {
        high: Math.round(todayHigh),
        low: Math.round(todayLow),
      },
      forecast: forecast,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching weather data', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
