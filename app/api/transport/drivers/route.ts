import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getTransportDrivers, createTransportDriver } from '@/lib/data/transport';
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

    const drivers = await getTransportDrivers(familyId);

    return NextResponse.json({ drivers });
  } catch (error) {
    logger.error('Error fetching transport drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport drivers' },
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
    const driver = await createTransportDriver(familyId, body);

    return NextResponse.json({
      success: true,
      driver,
      message: 'Driver created successfully',
    });
  } catch (error) {
    logger.error('Error creating transport driver:', error);
    return NextResponse.json(
      { error: 'Failed to create transport driver' },
      { status: 500 }
    );
  }
}
