#!/usr/bin/env tsx
/**
 * Create Admin User Script
 *
 * This script creates an initial admin user for production deployment.
 * Run with: npx tsx scripts/create-admin.ts
 */

import 'dotenv/config';
import { createAdminClient } from '@/lib/supabase/admin';
import { hash } from 'bcrypt';
import { ModuleId } from '@/app/generated/prisma';
import * as readline from 'readline';

const adminClient = createAdminClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function hiddenQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    stdout.write(query);

    // Disable echo
    if ((stdin as any).setRawMode) {
      (stdin as any).setRawMode(true);
    }

    let password = '';
    stdin.on('data', function onData(char: Buffer) {
      const c = char.toString('utf8');
      switch (c) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          if ((stdin as any).setRawMode) {
            (stdin as any).setRawMode(false);
          }
          stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          password = password.slice(0, -1);
          stdout.clearLine(0);
          stdout.cursorTo(0);
          stdout.write(query + '*'.repeat(password.length));
          break;
        default:
          password += c;
          stdout.write('*');
          break;
      }
    });
  });
}

async function main() {
  console.log('🚀 Hearth - Create Admin User\n');

  // Check if any families exist
  const { data: existingFamilies, error: familyCheckError } = await adminClient
    .from('families')
    .select('id')
    .limit(1);
  if (familyCheckError) {
    throw new Error(`Failed to check existing families: ${familyCheckError.message}`);
  }
  if (existingFamilies && existingFamilies.length > 0) {
    console.log('⚠️  Warning: Families already exist in the database.');
    const proceed = await question('Do you want to create another family? (yes/no): ');
    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  console.log('Please provide the following information:\n');

  // Family information
  const familyName = await question('Family Name (e.g., "The Smith Family"): ');
  if (!familyName.trim()) {
    console.error('❌ Family name is required.');
    process.exit(1);
  }

  const timezone = await question('Timezone (default: America/New_York): ') || 'America/New_York';

  // Admin user information
  console.log('\n📝 Admin User Information:');
  const adminName = await question('Admin Name: ');
  if (!adminName.trim()) {
    console.error('❌ Admin name is required.');
    process.exit(1);
  }

  const adminEmail = await question('Admin Email: ');
  if (!adminEmail.trim() || !adminEmail.includes('@')) {
    console.error('❌ Valid email is required.');
    process.exit(1);
  }

  // Check if email already exists
  const { data: existingUser, error: existingUserError } = await adminClient
    .from('family_members')
    .select('id')
    .eq('email', adminEmail)
    .limit(1)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(`Failed to check existing users: ${existingUserError.message}`);
  }

  if (existingUser) {
    console.error('❌ A user with this email already exists.');
    process.exit(1);
  }

  let password = '';
  let passwordConfirm = '';

  while (password !== passwordConfirm || password.length < 8) {
    password = await hiddenQuestion('Admin Password (min 8 characters): ');

    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long.');
      continue;
    }

    passwordConfirm = await hiddenQuestion('Confirm Password: ');

    if (password !== passwordConfirm) {
      console.log('❌ Passwords do not match. Please try again.\n');
    }
  }

  rl.close();

  console.log('\n🔨 Creating family and admin user...');

  try {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: adminEmail.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name: adminName.trim(),
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    // Create family
    const { data: family, error: familyError } = await adminClient
      .from('families')
      .insert({
        name: familyName.trim(),
        timezone: timezone,
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

    console.log(`✅ Family created: ${family.name}`);

    // Create admin user
    const passwordHash = await hash(password, 12);
    const { data: admin, error: adminError } = await adminClient
      .from('family_members')
      .insert({
        family_id: family.id,
        auth_user_id: authData.user.id,
        name: adminName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password_hash: passwordHash,
        role: 'PARENT',
        is_active: true,
      })
      .select()
      .single();

    if (adminError || !admin) {
      throw new Error(adminError?.message || 'Failed to create family member');
    }

    console.log(`✅ Admin user created: ${admin.name} (${admin.email})`);

    // Enable core modules
    const coreModules: ModuleId[] = [
      ModuleId.CHORES,
      ModuleId.SCREEN_TIME,
      ModuleId.CREDITS,
      ModuleId.SHOPPING,
      ModuleId.CALENDAR,
      ModuleId.TODOS,
      ModuleId.ROUTINES,
    ];

    const moduleConfigurations = coreModules.map((moduleId) => ({
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
      throw new Error(moduleError.message || 'Failed to enable modules');
    }

    console.log('✅ Core modules enabled');

    console.log('\n🎉 Setup complete!\n');
    console.log('You can now login with:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: (the password you just set)`);
    console.log('\nAccess your application at:', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
