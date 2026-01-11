import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCalendarSubscriptions, createCalendarSubscription } from '@/lib/data/calendar';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const subscriptions = await getCalendarSubscriptions(familyId);

    return NextResponse.json({ subscriptions });
  } catch (error) {
    logger.error('Get calendar subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to get subscriptions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    const memberId = authContext.defaultMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const subscription = await createCalendarSubscription(familyId, memberId, body);

    return NextResponse.json({
      success: true,
      subscription,
      message: 'Subscription created successfully',
    });
  } catch (error) {
    logger.error('Create calendar subscription error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
