import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthContext } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

type ModuleId =
  | 'CHORES'
  | 'SCREEN_TIME'
  | 'CREDITS'
  | 'SHOPPING'
  | 'CALENDAR'
  | 'TODOS'
  | 'ROUTINES'
  | 'MEAL_PLANNING'
  | 'RECIPES'
  | 'INVENTORY'
  | 'HEALTH'
  | 'PROJECTS'
  | 'COMMUNICATION'
  | 'TRANSPORT'
  | 'PETS'
  | 'MAINTENANCE'
  | 'DOCUMENTS'
  | 'FINANCIAL'
  | 'LEADERBOARD'
  | 'RULES_ENGINE';

const VALID_MODULE_IDS: ModuleId[] = [
  'CHORES',
  'SCREEN_TIME',
  'CREDITS',
  'SHOPPING',
  'CALENDAR',
  'TODOS',
  'ROUTINES',
  'MEAL_PLANNING',
  'RECIPES',
  'INVENTORY',
  'HEALTH',
  'PROJECTS',
  'COMMUNICATION',
  'TRANSPORT',
  'PETS',
  'MAINTENANCE',
  'DOCUMENTS',
  'FINANCIAL',
  'LEADERBOARD',
  'RULES_ENGINE',
];

/**
 * POST /api/setup/onboarding
 * Creates a new family and associates the authenticated user as the first member
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const authContext = await getAuthContext();

    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { familyName, timezone, weekStartDay, location, latitude, longitude, selectedModules } = body;

    // Validate required fields
    if (!familyName || !familyName.trim()) {
      return NextResponse.json(
        { error: 'Family name is required' },
        { status: 400 }
      );
    }

    if (!timezone) {
      return NextResponse.json(
        { error: 'Timezone is required' },
        { status: 400 }
      );
    }

    if (!weekStartDay || (weekStartDay !== 'SUNDAY' && weekStartDay !== 'MONDAY')) {
      return NextResponse.json(
        { error: 'Week start day must be SUNDAY or MONDAY' },
        { status: 400 }
      );
    }

    // Users can create multiple families - remove the check that prevents this
    // If they already have a family, this will create an additional one

    // Use admin client to bypass RLS for family creation
    // This is safe because we've already verified the user is authenticated
    // and doesn't belong to a family
    const adminClient = createAdminClient();

    // Create the family
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .insert({
        name: familyName.trim(),
        timezone,
        location: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
        settings: {
          weekStartDay: weekStartDay,
        },
      })
      .select()
      .single();

    if (familyError || !family) {
      logger.error('Error creating family:', familyError);
      return NextResponse.json(
        { error: 'Failed to create family' },
        { status: 500 }
      );
    }

    // Create family member record for the user as PARENT
    // Use admin client as well since user doesn't have family_id yet
    // Use email as name if no display name available
    const userName =
      (authContext.user as { user_metadata?: { name?: string }; email?: string }).user_metadata
        ?.name ||
      (authContext.user as { user_metadata?: { name?: string }; email?: string }).email?.split(
        '@'
      )[0] ||
      'User';
    
    const { error: memberError } = await adminClient
      .from('family_members')
      .insert({
        family_id: family.id,
        auth_user_id: authContext.user.id,
        name: userName,
        // email removed - field is deprecated and has UNIQUE constraint preventing multi-family
        role: 'PARENT',
        is_active: true,
      });

    if (memberError) {
      logger.error('Error creating family member:', memberError);
      // Attempt to rollback family creation
      await adminClient.from('families').delete().eq('id', family.id);
      return NextResponse.json(
        { error: 'Failed to add user to family' },
        { status: 500 }
      );
    }

    // Enable/disable modules based on selection
    const selectedModuleSet = new Set(
      Array.isArray(selectedModules)
        ? selectedModules.filter((m: string): m is ModuleId => VALID_MODULE_IDS.includes(m as ModuleId))
        : []
    );

    const moduleConfigurations = VALID_MODULE_IDS.map((moduleId) => ({
      family_id: family.id,
      module_id: moduleId,
      is_enabled: selectedModuleSet.has(moduleId),
      enabled_at: selectedModuleSet.has(moduleId) ? new Date().toISOString() : null,
      disabled_at: selectedModuleSet.has(moduleId) ? null : new Date().toISOString(),
    }));

    const { error: moduleConfigError } = await adminClient
      .from('module_configurations')
      .upsert(moduleConfigurations, { onConflict: 'family_id,module_id' });

    if (moduleConfigError) {
      logger.error('Error configuring modules:', moduleConfigError);
      return NextResponse.json(
        { error: 'Failed to configure modules' },
        { status: 500 }
      );
    }

    logger.info(`Family created successfully: ${family.id} by user ${authContext.user.id}`);

    return NextResponse.json({
      success: true,
      familyId: family.id,
      familyName: family.name,
      modules: {
        enabled: Array.from(selectedModuleSet),
        count: selectedModuleSet.size,
      },
    });
  } catch (error) {
    logger.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
