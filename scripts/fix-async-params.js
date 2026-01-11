#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find all route.ts files
const routeFiles = execSync('find app/api -name "route.ts" -type f', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let fixedCount = 0;

routeFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Check if file has params
  if (!content.includes('params')) {
    return;
  }

  // Extract function signatures with params
  const functionRegex = /export\s+async\s+function\s+(\w+)\s*\([^)]*\{[^}]*params[^}]*\}:\s*\{[^}]*params:\s*Promise<\{([^}]+)\}>[^}]*\}\)/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1];
    const paramsStr = match[2];
    
    // Extract param names (e.g., "id: string" -> ["id"])
    const paramNames = paramsStr
      .split(',')
      .map(p => p.trim().split(':')[0].trim())
      .filter(Boolean);
    
    if (paramNames.length === 0) continue;
    
    // Create destructuring line
    const destructure = `const { ${paramNames.join(', ')} } = await params`;
    
    // Find the function body start
    const funcStart = content.indexOf(`export async function ${funcName}`, match.index);
    const openBrace = content.indexOf('{', funcStart);
    const firstLineEnd = content.indexOf('\n', openBrace);
    
    // Check if destructuring already exists
    const funcBody = content.substring(openBrace, openBrace + 500);
    if (funcBody.includes('await params') || funcBody.includes(`const { ${paramNames[0]}`)) {
      continue; // Already fixed
    }
    
    // Insert destructuring after opening brace
    const insertPos = firstLineEnd + 1;
    content = content.slice(0, insertPos) + `    ${destructure}\n` + content.slice(insertPos);
    modified = true;
    
    // Replace all params.paramName with just paramName in this function
    // This is a simplified approach - may need refinement
    const funcEnd = findFunctionEnd(content, funcStart);
    const funcContent = content.substring(funcStart, funcEnd);
    
    paramNames.forEach(paramName => {
      const paramRegex = new RegExp(`params\\.${paramName}\\b`, 'g');
      if (paramRegex.test(funcContent)) {
        // Replace in the function scope
        const beforeFunc = content.substring(0, funcStart);
        const funcPart = content.substring(funcStart, funcEnd);
        const afterFunc = content.substring(funcEnd);
        
        content = beforeFunc + funcPart.replace(paramRegex, paramName) + afterFunc;
        modified = true;
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    fixedCount++;
    console.log(`Fixed: ${filePath}`);
  }
});

function findFunctionEnd(content, startPos) {
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  
  for (let i = startPos; i < content.length; i++) {
    const char = content[i];
    const prevChar = content[i - 1];
    
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
      stringChar = null;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          return i + 1;
        }
      }
    }
  }
  
  return content.length;
}

console.log(`\nFixed ${fixedCount} files.`);
