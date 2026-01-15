import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { addSymptomToHealthEvent } from '@/lib/data/health';
import { logger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = authContext.activeFamilyId;
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const body = await request.json();
    const symptom = await addSymptomToHealthEvent(id, body);

    return NextResponse.json({
      success: true,
      symptom,
      message: 'Symptom added successfully',
    });
  } catch (error) {
    logger.error('Add symptom error:', error);
    return NextResponse.json({ error: 'Failed to add symptom' }, { status: 500 });
  }
}
