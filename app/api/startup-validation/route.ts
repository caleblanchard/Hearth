/**
 * Startup Validation Endpoint
 * 
 * This endpoint validates environment variables on application startup.
 * Should be called during deployment/health checks.
 * 
 * GET /api/startup-validation
 */

import { NextResponse } from 'next/server';
import { validateEnv } from '@/lib/env-validation';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const result = validateEnv();
    
    if (!result.valid) {
      logger.error('Environment validation failed', undefined, {
        errors: result.errors,
        warnings: result.warnings,
      });
      
      return NextResponse.json(
        {
          valid: false,
          errors: result.errors,
          warnings: result.warnings,
        },
        { status: 500 }
      );
    }
    
    if (result.warnings.length > 0) {
      logger.warn('Environment validation warnings', { warnings: result.warnings });
    }
    
    return NextResponse.json(
      {
        valid: true,
        warnings: result.warnings,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Startup validation error', error);
    return NextResponse.json(
      { error: 'Failed to validate environment' },
      { status: 500 }
    );
  }
}
