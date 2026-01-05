import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/onboarding/check
 *
 * Check if the system has completed initial onboarding.
 * This endpoint is public (no authentication required) so the app
 * can determine whether to show the onboarding flow.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if system config exists and onboarding is complete
    const systemConfig = await prisma.systemConfig.findUnique({
      where: { id: 'system' },
      select: {
        onboardingComplete: true,
        setupCompletedAt: true,
      },
    });

    // If no config exists or onboarding is not complete, setup is required
    if (!systemConfig || !systemConfig.onboardingComplete) {
      return NextResponse.json({
        onboardingComplete: false,
        setupRequired: true,
      });
    }

    // Onboarding is complete
    return NextResponse.json({
      onboardingComplete: true,
      setupRequired: false,
      setupCompletedAt: systemConfig.setupCompletedAt?.toISOString(),
    });
  } catch (error) {
    logger.error('Error checking onboarding status', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
