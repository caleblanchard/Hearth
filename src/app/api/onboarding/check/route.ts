import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();
    
    // Check if system config exists and onboarding is complete
    const { data: systemConfig } = await supabase
      .from('system_config')
      .select('onboarding_complete, setup_completed_at')
      .eq('id', 'system')
      .maybeSingle();

    // If no config exists or onboarding is not complete, setup is required
    if (!systemConfig || !systemConfig.onboarding_complete) {
      return NextResponse.json({
        onboardingComplete: false,
        setupRequired: true,
      });
    }

    // Onboarding is complete
    return NextResponse.json({
      onboardingComplete: true,
      setupRequired: false,
      setupCompletedAt: systemConfig.setup_completed_at,
    });
  } catch (error) {
    logger.error('Error checking onboarding status', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}
