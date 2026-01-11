import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { createPushSubscription, deletePushSubscription } from '@/lib/data/notifications';
import { logger } from '@/lib/logger';

interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authContext.userId;
    if (!userId) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    const body: PushSubscriptionPayload = await request.json();

    // Validate subscription payload
    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;

    const subscription = await createPushSubscription(userId, {
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      userAgent,
    });

    logger.info('Push subscription saved', {
      userId,
      endpoint: body.endpoint,
    });

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Push subscription created successfully',
    });
  } catch (error) {
    logger.error('Subscribe push error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authContext.userId;
    if (!userId) {
      return NextResponse.json({ error: 'No user found' }, { status: 400 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    await deletePushSubscription(endpoint);

    logger.info('Push subscription deleted', {
      userId,
      endpoint,
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription deleted successfully',
    });
  } catch (error) {
    logger.error('Unsubscribe push error:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
