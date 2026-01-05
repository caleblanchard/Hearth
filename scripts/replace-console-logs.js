/**
 * Script to replace console.log statements with logger calls
 * 
 * Usage: node scripts/replace-console-logs.js
 * 
 * This script finds all console.log/error/warn/info/debug statements
 * in app/api and replaces them with appropriate logger calls.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.join(__dirname, '../app/api');

// Find all TypeScript files in app/api
function findTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(findTsFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Replace console statements
function replaceConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if logger is already imported
  const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"');
  
  // Replace console.error with logger.error
  if (content.includes('console.error')) {
    content = content.replace(
      /console\.error\((['"`])(.*?)\1\s*,\s*error\)/g,
      "logger.error('$2', error)"
    );
    content = content.replace(
      /console\.error\((['"`])(.*?)\1\)/g,
      "logger.error('$2')"
    );
    modified = true;
  }
  
  // Replace console.warn with logger.warn
  if (content.includes('console.warn')) {
    content = content.replace(
      /console\.warn\((['"`])(.*?)\1\)/g,
      "logger.warn('$2')"
    );
    modified = true;
  }
  
  // Replace console.log with logger.info (be careful with this)
  if (content.includes('console.log') && !content.includes('logger.')) {
    content = content.replace(
      /console\.log\((['"`])(.*?)\1\)/g,
      "logger.info('$2')"
    );
    modified = true;
  }
  
  // Replace console.info with logger.info
  if (content.includes('console.info')) {
    content = content.replace(
      /console\.info\((['"`])(.*?)\1\)/g,
      "logger.info('$2')"
    );
    modified = true;
  }
  
  // Replace console.debug with logger.debug
  if (content.includes('console.debug')) {
    content = content.replace(
      /console\.debug\((['"`])(.*?)\1\)/g,
      "logger.debug('$2')"
    );
    modified = true;
  }
  
  // Add logger import if needed
  if (modified && !hasLoggerImport) {
    // Find the last import statement
    const importRegex = /^import\s+.*?from\s+['"].*?['"];?$/gm;
    const imports = content.match(importRegex) || [];
    
    if (imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      const insertIndex = lastImportIndex + lastImport.length;
      
      // Add logger import after the last import
      content = content.slice(0, insertIndex) + 
        "\nimport { logger } from '@/lib/logger';" + 
        content.slice(insertIndex);
    } else {
      // Add at the top if no imports
      const firstLine = content.indexOf('\n');
      content = "import { logger } from '@/lib/logger';" + content.slice(firstLine);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Main execution
console.log('Finding TypeScript files in app/api...');
const files = findTsFiles(API_DIR);
console.log(`Found ${files.length} files`);

let modifiedCount = 0;
files.forEach(file => {
  try {
    if (replaceConsoleLogs(file)) {
      modifiedCount++;
      console.log(`Modified: ${path.relative(process.cwd(), file)}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nDone! Modified ${modifiedCount} files.`);
console.log('Please review the changes before committing.');
