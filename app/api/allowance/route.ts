import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
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

    // Fetch all allowance schedules for the family
    const { data: schedules, error } = await supabase
      .from('allowance_schedules')
      .select(`
        *,
        member:family_members!inner(id, name, email)
      `)
      .eq('member.family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching allowance schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch allowance schedules' }, { status: 500 });
    }

    return NextResponse.json({ schedules });
  } catch (error) {
    logger.error('Allowance schedules API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allowance schedules' },
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

    // Only parents can create allowance schedules
    const isParent = await isParentInFamily(memberId, familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Forbidden - Parent access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      memberId: targetMemberId,
      amount,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
    } = body;

    // Validate required fields
    if (!targetMemberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!frequency) {
      return NextResponse.json(
        { error: 'Frequency is required' },
        { status: 400 }
      );
    }

    // Validate frequency-specific fields
    if (frequency === 'WEEKLY' || frequency === 'BIWEEKLY') {
      if (dayOfWeek === null || dayOfWeek === undefined) {
        return NextResponse.json(
          { error: 'dayOfWeek is required for WEEKLY/BIWEEKLY frequency' },
          { status: 400 }
        );
      }
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json(
          { error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' },
          { status: 400 }
        );
      }
    }

    if (frequency === 'MONTHLY') {
      if (dayOfMonth === null || dayOfMonth === undefined) {
        return NextResponse.json(
          { error: 'dayOfMonth is required for MONTHLY frequency' },
          { status: 400 }
        );
      }
      if (dayOfMonth < 1 || dayOfMonth > 31) {
        return NextResponse.json(
          { error: 'dayOfMonth must be between 1 and 31' },
          { status: 400 }
        );
      }
    }

    // Verify member exists and belongs to the same family
    const { data: member } = await supabase
      .from('family_members')
      .select('id, family_id')
      .eq('id', targetMemberId)
      .single();

    if (!member || member.family_id !== familyId) {
      return NextResponse.json(
        { error: 'Family member not found' },
        { status: 404 }
      );
    }

    // Check for existing active schedule
    const { data: existingSchedule } = await supabase
      .from('allowance_schedules')
      .select('id')
      .eq('member_id', targetMemberId)
      .eq('is_active', true)
      .maybeSingle();

    if (existingSchedule) {
      return NextResponse.json(
        { error: 'This member already has an active allowance schedule' },
        { status: 409 }
      );
    }

    // Create the allowance schedule
    const { data: schedule, error } = await supabase
      .from('allowance_schedules')
      .insert({
        member_id: targetMemberId,
        amount,
        frequency,
        day_of_week:
          frequency === 'WEEKLY' || frequency === 'BIWEEKLY'
            ? dayOfWeek
            : null,
        day_of_month: frequency === 'MONTHLY' ? dayOfMonth : null,
        is_active: true,
        is_paused: false,
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
      })
      .select(`
        *,
        member:family_members(id, name, email)
      `)
      .single();

    if (error) {
      logger.error('Error creating allowance schedule:', error);
      return NextResponse.json({ error: 'Failed to create allowance schedule' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        schedule,
        message: 'Allowance schedule created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Create allowance schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to create allowance schedule' },
      { status: 500 }
    );
  }
}
