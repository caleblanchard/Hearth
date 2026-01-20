import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTemperatureReadings, recordTemperatureReading } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const targetMemberId = searchParams.get('memberId') || authContext.activeMemberId;
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const readings = await getTemperatureReadings(targetMemberId, days);

    return NextResponse.json({ readings });
  } catch (error) {
    logger.error('Get temperature readings error:', error);
    return NextResponse.json({ error: 'Failed to get readings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const targetMemberId = body.memberId || memberId;
    const reading = await recordTemperatureReading(targetMemberId, body.temperature, body.unit);

    return NextResponse.json({
      success: true,
      reading,
      message: 'Temperature recorded successfully',
    });
  } catch (error) {
    logger.error('Record temperature error:', error);
    return NextResponse.json({ error: 'Failed to record temperature' }, { status: 500 });
  }
}
