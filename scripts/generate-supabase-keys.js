#!/usr/bin/env node

/**
 * Generate Supabase API Keys for Self-Hosted Deployment
 * 
 * This script generates the anon and service_role JWT tokens
 * needed for self-hosted Supabase installations.
 * 
 * Usage:
 *   1. Set JWT_SECRET in your .env file
 *   2. Run: node scripts/generate-supabase-keys.js
 *   3. Copy the output to your .env file
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Try to load JWT_SECRET from .env
let jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  // Try to read from .env file
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/JWT_SECRET=(.+)/);
    if (match) {
      jwtSecret = match[1].trim();
    }
  }
}

if (!jwtSecret) {
  console.error('❌ Error: JWT_SECRET not found!');
  console.error('');
  console.error('Please set JWT_SECRET in your .env file first:');
  console.error('');
  console.error('  # Generate a secret:');
  console.error('  openssl rand -hex 32');
  console.error('');
  console.error('  # Add to .env:');
  console.error('  JWT_SECRET=your-secret-here');
  console.error('');
  process.exit(1);
}

console.log('🔑 Generating Supabase API Keys');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// Generate Anon Key (public, used by browser)
const anonKey = jwt.sign(
  {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
  },
  jwtSecret
);

// Generate Service Role Key (secret, used by server)
const serviceRoleKey = jwt.sign(
  {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60), // 10 years
  },
  jwtSecret
);

console.log('✅ Keys generated successfully!');
console.log('');
console.log('Add these to your .env file:');
console.log('');
console.log('# Supabase API Keys');
console.log(`SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('');
console.log('1. The ANON key is safe to use in your browser/frontend code');
console.log('2. The SERVICE_ROLE key should NEVER be exposed to the browser');
console.log('3. Keep your .env file secure and never commit it to git');
console.log('4. The SERVICE_ROLE key bypasses all Row Level Security policies');
console.log('');
console.log('═══════════════════════════════════════════════════════════════');

// Optionally write to .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('\n📝 Do you want to append these keys to your .env file? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Remove existing keys if present
      let updatedContent = envContent
        .replace(/SUPABASE_ANON_KEY=.*/g, '')
        .replace(/SUPABASE_SERVICE_ROLE_KEY=.*/g, '');
      
      // Add new keys
      updatedContent += `\n# Supabase API Keys (Generated: ${new Date().toISOString()})\n`;
      updatedContent += `SUPABASE_ANON_KEY=${anonKey}\n`;
      updatedContent += `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;
      
      fs.writeFileSync(envPath, updatedContent);
      console.log('✅ Keys appended to .env file');
    } else {
      console.log('⏭️  Skipped writing to .env file');
    }
    readline.close();
  });
} else {
  console.log('');
  console.log('💡 Tip: Copy the keys above to your .env file');
}
