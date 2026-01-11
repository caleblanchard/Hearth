import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/supabase/server';
import { initiateGoogleCalendarConnect } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const result = await initiateGoogleCalendarConnect(memberId);

    // Set state cookie for CSRF protection
    const response = NextResponse.json(result);
    response.cookies.set('google_oauth_state', result.state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    logger.error('Google Calendar connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google Calendar connection' }, { status: 500 });
  }
}
