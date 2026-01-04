#!/usr/bin/env tsx
/**
 * Create Admin User Script
 *
 * This script creates an initial admin user for production deployment.
 * Run with: npx tsx scripts/create-admin.ts
 */

import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash } from 'bcrypt';
import * as readline from 'readline';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  const existingFamilyCount = await prisma.family.count();
  if (existingFamilyCount > 0) {
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
  const existingUser = await prisma.familyMember.findUnique({
    where: { email: adminEmail },
  });

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
    // Create family
    const family = await prisma.family.create({
      data: {
        name: familyName,
        timezone: timezone,
        settings: {
          currency: 'USD',
          weekStartDay: 'SUNDAY',
        },
      },
    });

    console.log(`✅ Family created: ${family.name}`);

    // Create admin user
    const passwordHash = await hash(password, 12);
    const admin = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        name: adminName,
        email: adminEmail,
        passwordHash: passwordHash,
        role: 'PARENT',
        isActive: true,
      },
    });

    console.log(`✅ Admin user created: ${admin.name} (${admin.email})`);

    // Enable core modules
    const coreModules = [
      'CHORES',
      'SCREEN_TIME',
      'CREDITS',
      'SHOPPING',
      'CALENDAR',
      'TODOS',
      'ROUTINES',
    ];

    for (const moduleId of coreModules) {
      await prisma.moduleConfiguration.create({
        data: {
          familyId: family.id,
          moduleId: moduleId as any,
          isEnabled: true,
          enabledAt: new Date(),
        },
      });
    }

    console.log('✅ Core modules enabled');

    console.log('\n🎉 Setup complete!\n');
    console.log('You can now login with:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: (the password you just set)`);
    console.log('\nAccess your application at:', process.env.NEXTAUTH_URL || 'http://localhost:3000');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
