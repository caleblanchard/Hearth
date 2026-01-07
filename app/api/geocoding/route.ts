import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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
    // Verify authentication
    const session = await auth();
    if (!session || !session.user) {
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
      logger.error('WEATHER_API_KEY not configured');
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    let url: string;
    let isZipCode = false;

    if (zip) {
      // Zip code geocoding
      isZipCode = true;
      const zipParam = encodeURIComponent(`${zip},${country}`);
      url = `http://api.openweathermap.org/geo/1.0/zip?zip=${zipParam}&appid=${apiKey}`;
      
      logger.info('Geocoding zip code', { zip, country });
    } else {
      // City name geocoding (returns array of matches)
      const cityParam = encodeURIComponent(`${city},${country}`);
      url = `http://api.openweathermap.org/geo/1.0/direct?q=${cityParam}&limit=5&appid=${apiKey}`;
      
      logger.info('Geocoding city name', { city, country });
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenWeatherMap Geocoding API error', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        zip,
        city,
        country,
      });

      if (response.status === 404) {
        return NextResponse.json(
          { error: isZipCode ? 'Zip code not found' : 'City not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: `Failed to geocode location: ${response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Zip code API returns single object, city API returns array
    if (isZipCode) {
      // Single result from zip code lookup
      logger.info('Geocoding successful', { 
        input: `${zip},${country}`,
        result: data.name,
        lat: data.lat,
        lon: data.lon,
      });

      return NextResponse.json({
        name: data.name,
        lat: data.lat,
        lon: data.lon,
        country: data.country,
        state: data.state,
      });
    } else {
      // Array of results from city name lookup
      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json(
          { error: 'City not found' },
          { status: 404 }
        );
      }

      logger.info('Geocoding successful', { 
        input: `${city},${country}`,
        resultsCount: data.length,
      });

      // Return all matches for user to choose from
      const results = data.map((item: any) => ({
        name: item.name,
        lat: item.lat,
        lon: item.lon,
        country: item.country,
        state: item.state,
      }));

      return NextResponse.json({ results });
    }
  } catch (error) {
    logger.error('Error in geocoding API', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
}
