import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { handleGoogleCalendarCallback } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const settingsUrl = '/dashboard/settings/calendars';

  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for OAuth error
    if (error) {
      logger.warn('Google OAuth error', { error });
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=oauth_failed`, request.url)
      );
    }

    // Validate required parameters
    if (!code) {
      logger.warn('Missing code parameter');
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=missing_code`, request.url)
      );
    }

    if (!state) {
      logger.warn('Missing state parameter');
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=missing_state`, request.url)
      );
    }

    // Verify CSRF state
    const stateCookie = request.cookies.get('google_oauth_state');
    if (!stateCookie || stateCookie.value !== state) {
      logger.warn('Invalid OAuth state (CSRF protection)');
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=invalid_state`, request.url)
      );
    }

    // Handle the callback and create connection
    await handleGoogleCalendarCallback(memberId, code);

    // Redirect to settings with success message
    const response = NextResponse.redirect(
      new URL(`${settingsUrl}?success=calendar_connected`, request.url)
    );

    // Clear state cookie
    response.cookies.delete('google_oauth_state');

    return response;
  } catch (error: any) {
    logger.error('Google Calendar callback error:', error);
    
    // Check for token exchange errors
    if (
      error.message?.includes('Invalid authorization code') || 
      error.message?.includes('No refresh token') ||
      error.message?.includes('invalid_grant')
    ) {
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=token_exchange_failed`, request.url)
      );
    }

    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=connection_failed`, request.url)
    );
  }
}
