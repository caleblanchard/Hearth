#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push notifications
 * Run this script once to generate keys for your application
 *
 * Usage: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('Generating VAPID keys for Web Push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env.local file:\n');
console.log('━'.repeat(80));
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log('━'.repeat(80));
console.log('\n⚠️  IMPORTANT:');
console.log('  - Keep VAPID_PRIVATE_KEY secret and never commit it to version control');
console.log('  - NEXT_PUBLIC_VAPID_PUBLIC_KEY is safe to expose to the client');
console.log('  - VAPID_SUBJECT should be a mailto: or https: URL identifying you');
console.log('\n💡 After adding these to .env.local, restart your development server\n');
