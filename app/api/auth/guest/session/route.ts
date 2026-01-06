import { NextRequest, NextResponse } from 'next/server';
import { validateGuestSession } from '@/lib/guest-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('x-guest-session-token');

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token provided' }, { status: 401 });
    }

    const session = await validateGuestSession(sessionToken);

    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    return NextResponse.json({
      session: {
        sessionToken: session.sessionToken,
        guestName: session.guestName,
        accessLevel: session.accessLevel,
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    );
  }
}
