#!/usr/bin/env node

/**
 * Next.js 15/16 Migration Script
 * 
 * In Next.js 15+, cookies() is now async and must be awaited.
 * This script finds all usages of createClient() from lib/supabase/server
 * and reports which functions need to be made async.
 * 
 * Manual fixes required:
 * 1. Make functions that call createClient() async
 * 2. Await the createClient() call
 * 3. Update callers of those functions to await them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Scanning for createClient() usage from lib/supabase/server...\n');

// Find all files that import from lib/supabase/server
const result = execSync(
  `grep -r "from '@/lib/supabase/server'" --include="*.ts" --include="*.tsx" .`,
  { encoding: 'utf-8', cwd: process.cwd() }
).trim();

const files = result
  .split('\n')
  .map(line => line.split(':')[0])
  .filter((file, index, self) => self.indexOf(file) === index)
  .filter(file => !file.includes('node_modules'));

console.log(`Found ${files.length} files importing from lib/supabase/server:\n`);

let totalIssues = 0;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  // Check if file uses createClient()
  if (!content.includes('createClient()')) {
    return;
  }
  
  // Find the function/handler that contains createClient()
  const lines = content.split('\n');
  let issues = [];
  
  lines.forEach((line, index) => {
    if (line.includes('createClient()')) {
      // Look backwards to find the function definition
      let funcLine = index;
      while (funcLine > 0) {
        const currentLine = lines[funcLine];
        if (
          currentLine.includes('export async function') ||
          currentLine.includes('export function') ||
          currentLine.includes('async function') ||
          currentLine.includes('function ') ||
          currentLine.includes('const ') ||
          currentLine.includes('= async') ||
          currentLine.match(/^\s*(GET|POST|PUT|PATCH|DELETE)\s*\(/)
        ) {
          const isAsync = currentLine.includes('async');
          const hasAwait = line.includes('await createClient()');
          
          if (!isAsync || !hasAwait) {
            issues.push({
              line: index + 1,
              function: currentLine.trim(),
              needsAsync: !isAsync,
              needsAwait: !hasAwait
            });
          }
          break;
        }
        funcLine--;
      }
    }
  });
  
  if (issues.length > 0) {
    console.log(`\n📄 ${file}`);
    issues.forEach(issue => {
      totalIssues++;
      console.log(`   Line ${issue.line}: ${issue.function.substring(0, 80)}...`);
      if (issue.needsAsync) {
        console.log(`      ⚠️  Function needs 'async' keyword`);
      }
      if (issue.needsAwait) {
        console.log(`      ⚠️  createClient() needs 'await'`);
      }
    });
  }
});

console.log(`\n${'='.repeat(70)}`);
console.log(`\n📊 Summary: Found ${totalIssues} functions that need updates\n`);

console.log(`🔧 Manual fixes required:\n`);
console.log(`1. Add 'async' to function signatures`);
console.log(`2. Change 'createClient()' to 'await createClient()'`);
console.log(`3. Update callers to 'await' these functions\n`);

console.log(`Example fix:\n`);
console.log(`  // Before:`);
console.log(`  export function GET(request: Request) {`);
console.log(`    const supabase = createClient()`);
console.log(`  }`);
console.log(``);
console.log(`  // After:`);
console.log(`  export async function GET(request: Request) {`);
console.log(`    const supabase = await createClient()`);
console.log(`  }\n`);

if (totalIssues === 0) {
  console.log(`✅ All files are already using async/await correctly!\n`);
}
