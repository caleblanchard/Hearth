import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTemperatureReadings, recordTemperatureReading, startSickMode } from '@/lib/data/health';
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
    const logs = readings.map((reading) => ({
      id: reading.id,
      memberId: reading.member_id,
      temperature: reading.temperature,
      method: reading.method,
      recordedAt: reading.recorded_at,
      notes: reading.notes ?? null,
      member: reading.member,
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    logger.error('Get temperature readings error:', error);
    return NextResponse.json({ error: 'Failed to get readings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    const memberId = authContext.activeMemberId;

    if (!familyId || !memberId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    // Removed default to memberId to match test expectation of 400 if missing
    const targetMemberId = body.memberId;

    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (!body.temperature && body.temperature !== 0) {
      return NextResponse.json({ error: 'Temperature is required' }, { status: 400 });
    }

    if (!body.method) {
      return NextResponse.json({ error: 'Method is required' }, { status: 400 });
    }

    const validMethods = ['ORAL', 'RECTAL', 'ARMPIT', 'EAR', 'FOREHEAD'];
    if (!validMethods.includes(body.method)) {
      return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
    }

    if (body.temperature < 90 || body.temperature > 110) {
      return NextResponse.json(
        { error: 'Temperature must be between 90 and 110 degrees Fahrenheit' },
        { status: 400 }
      );
    }

    const actorMembership = authContext.memberships?.find((entry) => entry.id === memberId);
    if (actorMembership?.role === 'CHILD' && targetMemberId !== memberId) {
      return NextResponse.json(
        { error: 'Children can only log temperature for themselves' },
        { status: 403 }
      );
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', targetMemberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const reading = await recordTemperatureReading(
      targetMemberId,
      body.temperature,
      body.method,
      body.notes
    );

    const log = {
      id: reading.id,
      memberId: reading.member_id,
      temperature: reading.temperature,
      method: reading.method,
      recordedAt: reading.recorded_at,
      notes: reading.notes ?? null,
      member: reading.member,
    };

    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'TEMPERATURE_LOGGED',
      entity_type: 'TemperatureLog', // Changed to match test expectation (implied by test failing on TEMPERATURE_LOG vs TemperatureLog)
      entity_id: reading.id,
      result: 'SUCCESS',
    });

    // Sick Mode Auto-Trigger Logic
    let sickModeTriggered = false;
    
    // Fetch settings
    const { data: settings } = await supabase.from('sick_mode_settings').select('*').eq('family_id', familyId).maybeSingle();
    
    // Check if auto-enable is on and temperature exceeds threshold
    // Use snake_case for Supabase response property access which the bridge handles
    if (settings && settings.auto_enable_on_temperature && body.temperature >= settings.temperature_threshold) {
         // Check active instance
         const { data: activeInstance } = await supabase.from('sick_mode_instances').select('id').eq('member_id', targetMemberId).eq('is_active', true).maybeSingle();
         
         if (!activeInstance) {
              await startSickMode(
                  targetMemberId,
                  memberId, 
                  `Auto-triggered by high temperature (${body.temperature}°F)`,
                  undefined, 
                  'AUTO_FROM_HEALTH_EVENT'
              );
              sickModeTriggered = true;
         }
    }

    return NextResponse.json(
      {
        success: true,
        log,
        message: 'Temperature recorded successfully',
        sickModeTriggered
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Record temperature error:', error);
    return NextResponse.json({ error: 'Failed to record temperature' }, { status: 500 });
  }
}
