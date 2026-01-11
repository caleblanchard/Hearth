#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// Find all route.ts files
const routeFiles = execSync('find app/api -name "route.ts" -type f', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let fixedCount = 0;

routeFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    
    // Pattern to match: { params }: { params: Promise<{ paramName: type }> }
    const paramPattern = /\{\s*params\s*\}\s*:\s*\{\s*params:\s*Promise<\{\s*([^}]+)\s*\}\s*>\s*\}/g;
    
    let match;
    const functionsToFix = [];
    
    // Find all function signatures with params
    const functionPattern = /export\s+async\s+function\s+(\w+)\s*\([^)]*\{[^}]*params[^}]*\}:\s*\{[^}]*params:\s*Promise<\{([^}]+)\}>[^}]*\}\)/g;
    
    while ((match = functionPattern.exec(content)) !== null) {
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
      
      functionsToFix.push({ funcName, paramNames, matchIndex: match.index });
    }
    
    if (functionsToFix.length === 0) return;
    
    // Process each function (in reverse order to maintain indices)
    functionsToFix.reverse().forEach(({ funcName, paramNames, matchIndex }) => {
      // Find function start
      const funcStart = content.lastIndexOf(`export async function ${funcName}`, matchIndex);
      if (funcStart === -1) return;
      
      // Find opening brace
      const openBrace = content.indexOf('{', funcStart);
      if (openBrace === -1) return;
      
      // Find end of first line after opening brace
      let lineEnd = content.indexOf('\n', openBrace);
      if (lineEnd === -1) lineEnd = content.length;
      
      // Check if already has await params
      const nextFewLines = content.substring(openBrace, Math.min(openBrace + 200, content.length));
      if (nextFewLines.includes('await params') || nextFewLines.includes(`const { ${paramNames[0]}`)) {
        return; // Already fixed
      }
      
      // Create destructuring line
      const indent = '    ';
      const destructure = `${indent}const { ${paramNames.join(', ')} } = await params\n`;
      
      // Insert after opening brace's line
      content = content.slice(0, lineEnd + 1) + destructure + content.slice(lineEnd + 1);
      
      // Find function end and replace params.paramName
      const funcEnd = findFunctionEnd(content, funcStart);
      const beforeFunc = content.substring(0, funcStart);
      const funcContent = content.substring(funcStart, funcEnd);
      const afterFunc = content.substring(funcEnd);
      
      // Replace params.paramName with paramName in function body
      let newFuncContent = funcContent;
      paramNames.forEach(paramName => {
        // Use word boundary to avoid partial matches
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
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

function findFunctionEnd(content, startPos) {
  let braceCount = 0;
  let inString = false;
  let stringChar = null;
  let i = startPos;
  
  // Find the function opening brace
  while (i < content.length && content[i] !== '{') {
    i++;
  }
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
    
    i++;
  }
  
  return content.length;
}

console.log(`\nFixed ${fixedCount} files.`);
