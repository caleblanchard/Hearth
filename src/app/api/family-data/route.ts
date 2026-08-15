import { NextRequest, NextResponse } from 'next/server';
import { createClient, getAuthContext } from '@/lib/supabase/server';
import { updateParentFamilyConfiguration } from '@/lib/data/parent-configuration-lifecycle';
import { logger } from '@/lib/logger';
import { readJsonBody, routeHandler } from '@/lib/api-route';

/**
 * Workaround endpoint for /api/family which has Next.js routing issues
 * Returns the same data structure as /api/family
 * 
 * Supports multi-family: accepts optional ?familyId=xxx query param
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get family ID from query param or use default
    const { searchParams } = new URL(request.url);
    const requestedFamilyId = searchParams.get('familyId');
    
    // Verify user has access to requested family
    let familyId: string | null = null;
    if (requestedFamilyId) {
      const hasAccess = authContext.memberships.some(
        m => m.family_id === requestedFamilyId
      );
      if (hasAccess) {
        familyId = requestedFamilyId;
      } else {
        return NextResponse.json({ error: 'Access denied to requested family' }, { status: 403 });
      }
    } else {
      familyId = authContext.activeFamilyId;
    }

    if (!familyId) {
      return NextResponse.json({ error: 'No family found' }, { status: 400 });
    }

    // Fetch family
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (familyError || !familyData) {
      logger.error('Error fetching family:', familyError);
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // Fetch members separately
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('role', { ascending: true })
      .order('name', { ascending: true });

    if (membersError) {
      logger.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Map members to camelCase
    const members = (membersData || []).map((member: any) => ({
      id: member.id,
      userId: member.auth_user_id,
      name: member.name,
      email: member.email,
      role: member.role,
      birthDate: member.birth_date,
      avatarUrl: member.avatar_url,
      isActive: member.is_active,
      createdAt: member.created_at,
      inviteStatus: member.invite_status,
      inviteSentAt: member.invite_sent_at,
      inviteExpiresAt: member.invite_expires_at,
    }));

    // Build response matching /api/family structure
    const settings = (familyData.settings as any) || {};
    const VALID_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
    const family = {
      id: familyData.id,
      name: familyData.name,
      timezone: familyData.timezone,
      location: familyData.location,
      latitude: familyData.latitude,
      longitude: familyData.longitude,
      settings: {
        currency: settings.currency || 'USD',
        weekStartDay: settings.weekStartDay || 'SUNDAY',
        plannedMealTypes: Array.isArray(settings.plannedMealTypes) && settings.plannedMealTypes.length > 0
          ? settings.plannedMealTypes.filter((t: string) => VALID_MEAL_TYPES.includes(t))
          : VALID_MEAL_TYPES,
      },
      members,
    };

    return NextResponse.json({ family });
  } catch (error) {
    logger.error('Error fetching family data:', error);
    return NextResponse.json({ error: 'Failed to fetch family' }, { status: 500 });
  }
}

export const PATCH = routeHandler(async (request: NextRequest) => {
  const body = await readJsonBody<Record<string, unknown>>(request);
  const family = await updateParentFamilyConfiguration(body);

  return {
    success: true,
    family,
    message: 'Family updated successfully',
  };
}, { errorMessage: 'Failed to update family' });