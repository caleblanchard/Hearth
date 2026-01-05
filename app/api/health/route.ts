import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      ),
    ]);

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
