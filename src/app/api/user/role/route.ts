import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/supabase/server';

export async function GET() {
  try {
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberId = authContext.activeMemberId;
    if (!memberId) {
      return NextResponse.json({ error: 'No member found' }, { status: 400 });
    }

    // For kiosk child sessions, role is already in authContext.user.role
    if (authContext.user?.role) {
      return NextResponse.json({
        role: authContext.user.role,
        memberId,
        familyId: authContext.activeFamilyId,
      });
    }

    const supabase = await createClient();
    const { data: member, error } = await supabase
      .from('family_members')
      .select('role, auth_user_id')
      .eq('id', memberId)
      .single();

    if (error) {
      console.error('[API] Error fetching member role:', error);
      return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
    }

    console.log('[API] /api/user/role - memberId:', memberId, 'role:', member.role, 'authUserId:', member.auth_user_id);
    return NextResponse.json({ role: member.role, memberId, familyId: authContext.activeFamilyId, authUserId: member.auth_user_id });
  } catch (error) {
    console.error('Error in /api/user/role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
