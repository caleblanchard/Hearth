import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getRoutines, createRoutine } from '@/lib/data/routines';
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

    // Use data module
    const routines = await getRoutines(familyId);

    return NextResponse.json({ routines });
  } catch (error) {
    logger.error('Error fetching routines:', error);
    return NextResponse.json({ error: 'Failed to fetch routines' }, { status: 500 });
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
    const { name, timeOfDay, assignedTo, description } = body;

    // Validation
    if (!name || !timeOfDay) {
      return NextResponse.json(
        { error: 'Name and time of day are required' },
        { status: 400 }
      );
    }

    // Use data module
    const routine = await createRoutine({
      family_id: familyId,
      name: name.trim(),
      type: timeOfDay || 'CUSTOM',
      assigned_to: assignedTo || null,
      is_weekday: true,
      is_weekend: true,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      family_id: familyId,
      member_id: memberId,
      action: 'ROUTINE_CREATED',
      entity_type: 'ROUTINE',
      entity_id: routine.id,
      result: 'SUCCESS',
      metadata: {
        name: routine.name,
        type: routine.type,
      },
    });

    return NextResponse.json(
      { routine, message: 'Routine created successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating routine:', error);
    return NextResponse.json({ error: 'Failed to create routine' }, { status: 500 });
  }
}
