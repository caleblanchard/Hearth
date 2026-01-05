/**
 * Google Calendar OAuth Connection - Initiate Flow
 *
 * POST /api/calendar/google/connect
 * Generates OAuth authorization URL and sets state cookie for CSRF protection
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GoogleCalendarClient } from '@/lib/integrations/google-calendar';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate random state token for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Create Google Calendar client and get authorization URL
    const client = new GoogleCalendarClient();
    const authUrl = client.getAuthUrl(state);

    // Create response with auth URL
    const response = NextResponse.json({ authUrl }, { status: 200 });

    // Set state cookie for verification in callback
    response.cookies.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/api/calendar/google',
    });

    logger.info('Google Calendar OAuth flow initiated', {
      userId: session.user.id,
      email: session.user.email,
    });

    return response;
  } catch (error) {
    logger.error('Failed to initiate Google Calendar connection', { error });

    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar connection' },
      { status: 500 }
    );
  }
}
