import { NextRequest, NextResponse } from 'next/server';
import { endGuestSession, validateGuestSession } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-guest-session-token');

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
    }

    // Validate session first
    const session = await validateGuestSession(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // End the session
    const success = await endGuestSession(sessionToken);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to end session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Session ended successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    );
  }
}
