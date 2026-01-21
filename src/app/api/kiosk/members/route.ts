import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateDeviceSecret } from '@/lib/kiosk-auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/kiosk/members
 *
 * Get family members for an active kiosk session
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient();
    const deviceAuth = await authenticateDeviceSecret();
    if (!deviceAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: members, error } = await supabase
      .from('family_members')
      .select('id, name, role, avatar_url')
      .eq('family_id', deviceAuth.familyId)
      .eq('is_active', true)
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching kiosk members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch family members' },
        { status: 500 }
      );
    }

    const mappedMembers = (members || []).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      avatarUrl: member.avatar_url,
    }));

    return NextResponse.json({ members: mappedMembers });
  } catch (error) {
    logger.error('Error fetching kiosk members', error);
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    );
  }
}
