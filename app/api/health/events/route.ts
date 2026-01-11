import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getHealthEvents, createHealthEvent } from '@/lib/data/health';
import { logger } from '@/lib/logger';

const VALID_EVENT_TYPES = [
  'ILLNESS',
  'INJURY',
  'DOCTOR_VISIT',
  'WELLNESS_CHECK',
  'VACCINATION',
  'OTHER',
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const eventType = searchParams.get('eventType');
    const active = searchParams.get('active');

    // Filter options
    const filters: any = {};
    
    if (memberId) {
      // Verify member belongs to family
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('id', memberId)
        .eq('family_id', familyId)
        .single();

      if (!member) {
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      filters.memberId = memberId;
    }

    if (eventType) {
      filters.eventType = eventType;
    }

    if (active === 'true') {
      filters.activeOnly = true;
    }

    const events = await getHealthEvents(familyId, filters);

    return NextResponse.json({ events });
  } catch (error) {
    logger.error('Health events API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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
    const {
      memberId: targetMemberId,
      eventType,
      title,
      description,
      severity,
      startedAt,
    } = body;

    // Validation
    if (!targetMemberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Event type must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Verify member belongs to family
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('id', targetMemberId)
      .eq('family_id', familyId)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Create event
    const event = await createHealthEvent({
      memberId: targetMemberId,
      eventType,
      title: title.trim(),
      description: description?.trim() || null,
      severity: severity || 'MODERATE',
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      recordedById: memberId,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'HEALTH_EVENT_CREATED',
      entity_type: 'HEALTH_EVENT',
      entity_id: event.id,
      result: 'SUCCESS',
      metadata: { title, eventType, targetMemberId },
    });

    return NextResponse.json({
      success: true,
      event,
      message: 'Health event created successfully',
    });
  } catch (error) {
    logger.error('Create health event error:', error);
    return NextResponse.json(
      { error: 'Failed to create health event' },
      { status: 500 }
    );
  }
}
