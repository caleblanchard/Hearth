import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getCarpoolGroups, createCarpoolGroup } from '@/lib/data/transport';
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

    const carpools = await getCarpoolGroups(familyId);

    return NextResponse.json({ carpools });
  } catch (error) {
    logger.error('Error fetching carpool groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch carpool groups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    if (!authContext.user.role || authContext.user.role !== 'PARENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const carpool = await createCarpoolGroup({
      family_id: familyId,
      name: body.name,
    });

    return NextResponse.json({
      success: true,
      carpool,
      message: 'Carpool group created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating carpool group:', error);
    return NextResponse.json(
      { error: 'Failed to create carpool group' },
      { status: 500 }
    );
  }
}
