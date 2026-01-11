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

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100');
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const readings = await getTemperatureReadings(familyId, { memberId, limit, startDate, endDate });

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

    const memberId = authContext.defaultMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    const body = await request.json();
    const reading = await recordTemperatureReading(body.memberId, memberId, body);

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
