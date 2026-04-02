import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

/**
 * Health Check Endpoint
 *
 * Returns the health status of the application and database.
 * Used by Docker healthchecks and monitoring systems.
 *
 * GET /api/health
 * 
 * Security: Does not expose sensitive error information in production
 */
export async function GET() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  try {
    // Check database connection with timeout
    const supabase = createAdminClient();
    const { error } = (await Promise.race([
      supabase.from('families').select('id').limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      ),
    ])) as { error?: { message?: string } };

    if (error) {
      throw new Error(error.message || 'Database connection failed');
    }

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          application: 'up',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Log detailed error server-side
    logger.error('Health check failed', error, {
      timestamp: new Date().toISOString(),
    });

    // Return generic error in production, detailed in development
    const errorMessage = isProduction 
      ? 'Service unavailable' 
      : (error instanceof Error ? error.message : 'Unknown error');

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'down',
          application: 'up',
        },
        ...(isProduction ? {} : { error: errorMessage }),
      },
      { status: 503 }
    );
  }
}
