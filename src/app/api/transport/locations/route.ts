import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext, isParentInFamily } from '@/lib/supabase/server';
import { getTransportLocations, createTransportLocation } from '@/lib/data/transport';
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

    const locations = await getTransportLocations(familyId);

    return NextResponse.json({ locations });
  } catch (error) {
    logger.error('Error fetching transport locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport locations' },
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

    const isParent = await isParentInFamily(familyId);
    if (!isParent) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const location = await createTransportLocation(familyId, body);

    return NextResponse.json({
      success: true,
      location,
      message: 'Location created successfully',
    }, { status: 201 });
  } catch (error) {
    logger.error('Error creating transport location:', error);
    return NextResponse.json(
      { error: 'Failed to create transport location' },
      { status: 500 }
    );
  }
}
