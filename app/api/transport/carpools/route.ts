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

    const familyId = authContext.defaultFamilyId;
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

    const familyId = authContext.defaultFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const carpool = await createCarpoolGroup(familyId, body);

    return NextResponse.json({
      success: true,
      carpool,
      message: 'Carpool group created successfully',
    });
  } catch (error) {
    logger.error('Error creating carpool group:', error);
    return NextResponse.json(
      { error: 'Failed to create carpool group' },
      { status: 500 }
    );
  }
}
