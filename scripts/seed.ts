import 'dotenv/config';
import { hash } from 'bcrypt';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSampleData } from '@/lib/sample-data-generator';
import { ModuleId } from '@/lib/enums';

async function main() {
  console.log('🌱 Seeding database...');

  const adminClient = createAdminClient();

  const { data: existingFamilies, error: familyCheckError } = await adminClient
    .from('families')
    .select('id')
    .limit(1);

  if (familyCheckError) {
    throw new Error(`Failed to check existing families: ${familyCheckError.message}`);
  }

  if (existingFamilies && existingFamilies.length > 0) {
    console.log('⚠️  Families already exist. Seed skipped.');
    return;
  }

  console.log('👨‍👩‍👧‍👦 Creating test family...');
  const { data: family, error: familyError } = await adminClient
    .from('families')
    .insert({
      name: 'The Smith Family',
      timezone: 'America/New_York',
      settings: {
        currency: 'USD',
        weekStartDay: 'SUNDAY',
      },
    })
    .select()
    .single();

  if (familyError || !family) {
    throw new Error(familyError?.message || 'Failed to create family');
  }

  console.log('✓ Marking onboarding as complete...');
  const { error: systemConfigError } = await adminClient
    .from('system_config')
    .upsert({
      id: 'system',
      onboarding_complete: true,
      setup_completed_at: new Date().toISOString(),
      version: '0.1.0',
    });

  if (systemConfigError) {
    throw new Error(systemConfigError.message);
  }

  console.log('👤 Creating parent account...');
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: 'sarah@example.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { name: 'Sarah Smith' },
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create auth user');
  }

  const parentPasswordHash = await hash('password123', 12);
  const { data: parent, error: parentError } = await adminClient
    .from('family_members')
    .insert({
      family_id: family.id,
      auth_user_id: authData.user.id,
      name: 'Sarah Smith',
      email: 'sarah@example.com',
      password_hash: parentPasswordHash,
      role: 'PARENT',
      birth_date: new Date('1985-06-15').toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (parentError || !parent) {
    throw new Error(parentError?.message || 'Failed to create parent member');
  }

  console.log('👧👦 Creating children accounts...');
  const childPin = await hash('1234', 12);
  const { error: childrenError } = await adminClient.from('family_members').insert([
    {
      family_id: family.id,
      name: 'Alice Smith',
      email: null,
      pin: childPin,
      role: 'CHILD',
      birth_date: new Date('2015-03-20').toISOString(),
      is_active: true,
    },
    {
      family_id: family.id,
      name: 'Bob Smith',
      email: null,
      pin: childPin,
      role: 'CHILD',
      birth_date: new Date('2017-09-10').toISOString(),
      is_active: true,
    },
  ]);

  if (childrenError) {
    throw new Error(childrenError.message);
  }

  console.log('⚙️  Enabling modules...');
  const enabledModules = [
    ModuleId.CHORES,
    ModuleId.SCREEN_TIME,
    ModuleId.CREDITS,
    ModuleId.SHOPPING,
    ModuleId.CALENDAR,
    ModuleId.TODOS,
    ModuleId.ROUTINES,
    ModuleId.MEAL_PLANNING,
    ModuleId.RECIPES,
    ModuleId.INVENTORY,
    ModuleId.MAINTENANCE,
    ModuleId.COMMUNICATION,
  ];

  const moduleConfigurations = enabledModules.map((moduleId) => ({
    family_id: family.id,
    module_id: moduleId,
    is_enabled: true,
    enabled_at: new Date().toISOString(),
    disabled_at: null,
  }));

  const { error: moduleError } = await adminClient
    .from('module_configurations')
    .upsert(moduleConfigurations, { onConflict: 'family_id,module_id' });

  if (moduleError) {
    throw new Error(moduleError.message);
  }

  console.log('📦 Generating sample data...');
  await generateSampleData(adminClient, {
    familyId: family.id,
    adminId: parent.id,
    enabledModules,
  });

  console.log('✅ Seed complete!');
}

main().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});

