import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';
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

    const { data: family, error } = await supabase
      .from('families')
      .select(`
        *,
        members:family_members(id, name, email, role, birth_date, avatar_url, is_active, created_at)
      `)
      .eq('id', familyId)
      .order('role', { foreignTable: 'members', ascending: true })
      .order('name', { foreignTable: 'members', ascending: true })
      .single();

    if (error || !family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    return NextResponse.json({ family });
  } catch (error) {
    logger.error('Error fetching family:', error);
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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

    const body = await request.json();

    const { data: family, error } = await supabase
      .from('families')
      .update(body)
      .eq('id', familyId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating family:', error);
      return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      family,
      message: 'Family updated successfully',
    });
  } catch (error) {
    logger.error('Error updating family:', error);
    return NextResponse.json({ error: 'Failed to update family' }, { status: 500 });
  }
}
