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

    const familyId = authContext.activeFamilyId;
    const userId = authContext.user.id;
    
    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    const { data: family, error } = await supabase
      .from('families')
      .select(`
        *,
        members:family_members(id, user_id, name, email, role, birth_date, avatar_url, is_active, created_at)
      `)
      .eq('id', familyId)
      .order('role', { foreignTable: 'members', ascending: true })
      .order('name', { foreignTable: 'members', ascending: true })
      .single();

    if (error || !family) {
      logger.error('Error fetching family:', error);
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Map to camelCase
    const settings = (family.settings as any) || {};
    const mappedFamily = {
      id: family.id,
      name: family.name,
      weekStartDay: settings.weekStartDay || 'SUNDAY',
      timezone: family.timezone,
      createdAt: family.created_at,
      updatedAt: family.updated_at,
      members: (family.members || []).map((member: any) => ({
        id: member.id,
        userId: member.user_id,
        name: member.name,
        email: member.email,
        role: member.role,
        birthDate: member.birth_date,
        avatarUrl: member.avatar_url,
        isActive: member.is_active,
        createdAt: member.created_at,
      })),
    };

    // Find current user's role
    const currentMember = mappedFamily.members.find((m: any) => m.userId === userId);
    const currentRole = currentMember?.role || null;

    return NextResponse.json({ 
      family: mappedFamily,
      currentRole,
    });
  } catch (error) {
    logger.error('Error fetching family info:', error);
    return NextResponse.json({ error: 'Failed to fetch family info' }, { status: 500 });
  }
}
