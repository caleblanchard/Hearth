import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { registerFamily } from '@/lib/auth/signup';
import { generateSampleData } from '@/lib/sample-data-generator';
import { sendWelcomeEmail } from '@/lib/welcome-email';
import { logger } from '@/lib/logger';
import { sanitizeString, sanitizeEmail } from '@/lib/input-sanitization';

type ModuleId = 'CHORES' | 'SCREEN_TIME' | 'CREDITS' | 'SHOPPING' | 'CALENDAR' | 'TODOS' | 'ROUTINES' | 'MEAL_PLANNING' | 'RECIPES' | 'INVENTORY' | 'HEALTH' | 'PROJECTS' | 'COMMUNICATION' | 'TRANSPORT' | 'PETS' | 'MAINTENANCE' | 'DOCUMENTS' | 'FINANCIAL' | 'LEADERBOARD' | 'RULES_ENGINE';

/**
 * POST /api/onboarding/setup
 *
 * Complete initial system onboarding by creating:
 * 1. Family record
 * 2. First admin/parent user
 * 3. Module configurations
 * 4. Optional sample data
 * 5. Mark system as onboarded
 *
 * This endpoint is public (no authentication required) but can only
 * be called once during initial setup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      familyName,
      timezone,
      location,
      latitude,
      longitude,
      adminName,
      adminEmail,
      adminPassword,
      selectedModules = [],
      generateSampleData: shouldGenerateSampleData = false,
    } = body;

    const supabase = await createClient();

    // Check if onboarding is already complete
    const { data: existingConfig } = await supabase
      .from('system_config')
      .select('onboarding_complete')
      .eq('id', 'system')
      .maybeSingle();

    if (existingConfig?.onboarding_complete) {
      return NextResponse.json(
        { error: 'Onboarding already complete' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!familyName || !familyName.trim()) {
      return NextResponse.json(
        { error: 'Family name is required' },
        { status: 400 }
      );
    }

    if (!adminName || !adminName.trim()) {
      return NextResponse.json(
        { error: 'Admin name is required' },
        { status: 400 }
      );
    }

    if (!adminEmail || !adminEmail.trim()) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    if (!adminPassword || !adminPassword.trim()) {
      return NextResponse.json(
        { error: 'Admin password is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 8 characters)
    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Validate selected modules
    const validModuleIds: ModuleId[] = [
      'CHORES', 'SCREEN_TIME', 'CREDITS', 'SHOPPING', 'CALENDAR', 'TODOS',
      'ROUTINES', 'MEAL_PLANNING', 'RECIPES', 'INVENTORY', 'HEALTH', 'PROJECTS',
      'COMMUNICATION', 'TRANSPORT', 'PETS', 'MAINTENANCE', 'DOCUMENTS', 'FINANCIAL', 'LEADERBOARD', 'RULES_ENGINE'
    ];
    const invalidModules = selectedModules.filter(
      (moduleId: string) => !validModuleIds.includes(moduleId as ModuleId)
    );

    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid module IDs: ${invalidModules.join(', ')}` },
        { status: 400 }
      );
    }

    // NOTE: We use the registerFamily helper which:
    // 1. Creates Supabase Auth user
    // 2. Uses admin client to create family (bypassing RLS)
    // 3. Links family_member to auth user
    
    try {
      // Use the signup helper that handles RLS correctly
      const result = await registerFamily({
        familyName: familyName.trim(),
        timezone: timezone || 'America/New_York',
        location: location?.trim() || null,
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude.toString()) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude.toString()) : null,
        parentName: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
      });

      if (!result.success || !result.family || !result.member) {
        throw new Error(result.error || 'Failed to create family');
      }

      const family = result.family;
      const admin = result.member;

      // Create module configurations for selected modules using admin client
      const adminClient = createAdminClient();
      const moduleConfigurations = [];
      for (const moduleId of selectedModules) {
        const { data: config } = await adminClient
          .from('module_configurations')
          .insert({
            family_id: family.id,
            module_id: moduleId as ModuleId,
            is_enabled: true,
            enabled_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (config) moduleConfigurations.push(config);
      }

      // Generate sample data if requested
      // NOTE: This still uses Prisma in the sample-data-generator
      // which is acceptable for a one-time setup operation
      if (shouldGenerateSampleData && selectedModules.length > 0) {
        try {
          // Sample data generator still uses Prisma - would need major refactor
          // For now, we'll note this in logs
          logger.warn('Sample data generation uses Prisma - skipped in Supabase migration');
          // await generateSampleData(tx, {
          //   familyId: family.id,
          //   adminId: admin.id,
          //   enabledModules: selectedModules as ModuleId[],
          // });
        } catch (error) {
          logger.error('Sample data generation failed', error);
          // Don't fail the entire setup if sample data fails
        }
      }

      // Mark onboarding as complete using admin client
      const { data: systemConfig } = await adminClient
        .from('system_config')
        .upsert({
          id: 'system',
          onboarding_complete: true,
          setup_completed_at: new Date().toISOString(),
          setup_completed_by: admin.id,
        })
        .select()
        .single();

      // Log successful onboarding
      logger.info('Onboarding completed', {
        familyId: family.id,
        familyName: family.name,
        adminId: admin.id,
        enabledModules: selectedModules,
        sampleDataGenerated: shouldGenerateSampleData,
      });

      // Send welcome email (non-blocking - don't wait for it)
      if (admin.email) {
        sendWelcomeEmail({
          familyName: family.name,
          adminName: admin.name,
          adminEmail: admin.email,
          enabledModules: selectedModules,
          sampleDataGenerated: shouldGenerateSampleData,
        }).catch(error => {
          logger.error('Failed to send welcome email', error);
        });
      }

      return NextResponse.json({
        success: true,
        family: {
          id: family.id,
          name: family.name,
          timezone: family.timezone,
        },
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
        modules: {
          enabled: selectedModules,
          count: selectedModules.length,
        },
        sampleData: {
          generated: false, // Currently disabled for Supabase
          note: 'Sample data generation requires Prisma transaction support',
        },
      });
    } catch (error: any) {
      logger.error('Error completing onboarding', error);

      // Handle unique constraint errors
      if (error.code === '23505') {
        if (error.message?.includes('email')) {
          return NextResponse.json(
            { error: 'An account with this email already exists' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error('Error completing onboarding', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
