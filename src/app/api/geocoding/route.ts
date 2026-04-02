import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * GET /api/geocoding
 *
 * Convert zip code or city name to geographic coordinates using OpenWeatherMap Geocoding API
 * 
 * Query Parameters:
 * - zip: Zip/postal code (e.g., "90210")
 * - city: City name (e.g., "London")
 * - country: ISO 3166 country code (default: "US")
 * 
 * Returns: { name, lat, lon, country, state? } or { results: [...] } for city lookups
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zip = searchParams.get('zip');
    const city = searchParams.get('city');
    const country = searchParams.get('country') || 'US';

    // Validate input
    if (!zip && !city) {
      return NextResponse.json(
        { error: 'Either zip or city parameter is required' },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    let url: string;
    if (zip) {
      url = `https://api.openweathermap.org/geo/1.0/zip?zip=${encodeURIComponent(
        zip
      )}%2C${encodeURIComponent(country)}&appid=${apiKey}`;
    } else {
      url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        city || ''
      )}%2C${encodeURIComponent(country)}&limit=5&appid=${apiKey}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      if (zip && response.status === 404) {
        return NextResponse.json({ error: 'Zip code not found' }, { status: 404 });
      }
      logger.error('Geocoding API error', { status: response.status });
      return NextResponse.json(
        { error: 'Failed to fetch geocoding data' },
        { status: 500 }
      );
    }

    const data = await response.json();
    if (!zip && Array.isArray(data) && data.length === 0) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json(zip ? data : { results: data });
  } catch (error) {
    logger.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geocoding data' },
      { status: 500 }
    );
  }
}
