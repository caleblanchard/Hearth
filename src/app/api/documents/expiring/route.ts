import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
import { getExpiringDocuments } from '@/lib/data/documents';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
    const days = parseInt(searchParams.get('days') || '90', 10);
    const documents = await getExpiringDocuments(familyId, Number.isNaN(days) ? 90 : days);

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Error fetching expiring documents:', error);
    return NextResponse.json({ error: 'Failed to fetch expiring documents' }, { status: 500 });
  }
}
