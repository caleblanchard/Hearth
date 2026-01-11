#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Find all route.ts files that still use params.*
const routeFiles = execSync('find app/api -name "route.ts" -type f', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let fixedCount = 0;

routeFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Check if file uses params.* directly
    if (!content.match(/params\.\w+/)) {
      return; // No params.* usage
    }
    
    // Find all function signatures with params: Promise<{...}>
    const funcRegex = /export\s+async\s+function\s+(\w+)\s*\([^,]+,\s*\{\s*params\s*\}:\s*\{\s*params:\s*Promise<\{\s*([^}]+)\s*\}\s*>\s*\}\)/g;
    
    let match;
    const fixes = [];
    
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1];
      const paramsStr = match[2];
      
      // Extract param names
      const paramNames = paramsStr
        .split(',')
        .map(p => {
          const trimmed = p.trim();
          const colonIndex = trimmed.indexOf(':');
          return colonIndex > 0 ? trimmed.substring(0, colonIndex).trim() : null;
        })
        .filter(Boolean);
      
      if (paramNames.length === 0) continue;
      
      fixes.push({ funcName, paramNames, matchIndex: match.index });
    }
    
    if (fixes.length === 0) return;
    
    // Process each function (in reverse to maintain indices)
    fixes.reverse().forEach(({ funcName, paramNames }) => {
      // Find function start
      const funcStart = content.lastIndexOf(`export async function ${funcName}`);
      if (funcStart === -1) return;
      
      // Find opening brace
      const openBrace = content.indexOf('{', funcStart);
      if (openBrace === -1) return;
      
      // Find first line after opening brace
      let lineEnd = content.indexOf('\n', openBrace);
      if (lineEnd === -1) lineEnd = content.length;
      
      // Check if already has destructuring
      const nextLines = content.substring(openBrace, Math.min(openBrace + 300, content.length));
      const hasDestructure = paramNames.some(name => 
        nextLines.includes(`const { ${name}`) || nextLines.includes(`const {${name}`)
      );
      
      if (hasDestructure) {
        // Just need to add await if missing
        const awaitPattern = new RegExp(`const\\s*{\\s*${paramNames.join('\\s*,\\s*')}\\s*}\\s*=\\s*params[^a]`, 'g');
        if (awaitPattern.test(nextLines)) {
          content = content.replace(
            new RegExp(`(const\\s*{\\s*${paramNames.join('\\s*,\\s*')}\\s*}\\s*=\\s*)params([^a])`, 'g'),
            `$1await params$2`
          );
        }
        return;
      }
      
      // Add destructuring after opening brace
      const indent = '    ';
      const destructure = `${indent}const { ${paramNames.join(', ')} } = await params\n`;
      content = content.slice(0, lineEnd + 1) + destructure + content.slice(lineEnd + 1);
      
      // Find function end
      const funcEnd = findFunctionEnd(content, funcStart);
      const beforeFunc = content.substring(0, funcStart);
      const funcContent = content.substring(funcStart, funcEnd);
      const afterFunc = content.substring(funcEnd);
      
      // Replace params.paramName with paramName
      let newFuncContent = funcContent;
      paramNames.forEach(paramName => {
        const regex = new RegExp(`\\bparams\\.${paramName}\\b`, 'g');
        newFuncContent = newFuncContent.replace(regex, paramName);
      });
      
      content = beforeFunc + newFuncContent + afterFunc;
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf-8');
      fixedCount++;
      console.log(`Fixed: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error: ${filePath}:`, error.message);
  }
});

function findFunctionEnd(content, startPos) {
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let i = startPos;
  
  // Find opening brace
  while (i < content.length && content[i] !== '{') i++;
  if (i >= content.length) return content.length;
  
  braceCount = 1;
  i++;
  
  while (i < content.length && braceCount > 0) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    if (!inString && (char === '"' || char === "'" || char === '`')) {
      inString = true;
      stringChar = char;
    } else if (inString && char === stringChar && prevChar !== '\\') {
      inString = false;
    }
    
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) return i + 1;
      }
    }
    i++;
  }
  
  return content.length;
}

console.log(`\nFixed ${fixedCount} files.`);
