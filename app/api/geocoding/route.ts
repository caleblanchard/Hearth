import { NextRequest, NextResponse } from 'next/server';
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
    // Note: This endpoint is public to allow geocoding during onboarding
    // The API key is rate-limited and only provides geocoding data

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
        { error: 'Geocoding API not configured' },
        { status: 503 }
      );
    }

    let url: string;
    if (zip) {
      url = `https://api.openweathermap.org/geo/1.0/zip?zip=${zip},${country}&appid=${apiKey}`;
    } else {
      url = `https://api.openweathermap.org/geo/1.0/direct?q=${city},${country}&limit=5&appid=${apiKey}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      logger.error('Geocoding API error', { status: response.status });
      return NextResponse.json(
        { error: 'Failed to fetch geocoding data' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json(zip ? data : { results: data });
  } catch (error) {
    logger.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geocoding data' },
      { status: 500 }
    );
  }
}
