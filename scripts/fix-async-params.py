#!/usr/bin/env python3
import re
import sys
from pathlib import Path

def fix_route_file(file_path):
    """Fix async params in a Next.js route handler file"""
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    modified = False
    
    # Pattern to match function signatures with params
    # Matches: export async function NAME(request, { params }: { params: Promise<{ ... }> })
    pattern = r'(export\s+async\s+function\s+\w+\s*\([^,]+,\s*\{[^}]*params[^}]*\}:\s*\{[^}]*params:\s*Promise<\{([^}]+)\}>[^}]*\}\))'
    
    def replace_function(match):
        full_match = match.group(0)
        params_str = match.group(2)
        
        # Extract param names
        param_names = [p.strip().split(':')[0].strip() for p in params_str.split(',') if ':' in p]
        
        if not param_names:
            return full_match
        
        # Find the function body
        func_start = match.start()
        func_end = find_function_end(content, func_start)
        func_body = content[func_start:func_end]
        
        # Check if already fixed
        if f'const {{ {param_names[0]} }} = await params' in func_body:
            return full_match
        
        # Create destructuring line
        destructure = f'    const {{ {", ".join(param_names)} }} = await params\n'
        
        # Find insertion point (after opening brace of function)
        open_brace = func_body.find('{')
        first_newline = func_body.find('\n', open_brace)
        insert_pos = func_start + first_newline + 1
        
        # Insert destructuring
        new_content = content[:insert_pos] + destructure + content[insert_pos:]
        
        # Replace params.paramName with paramName in function body
        func_start_new = new_content.find('export async function', func_start)
        func_end_new = find_function_end(new_content, func_start_new)
        func_body_new = new_content[func_start_new:func_end_new]
        
        for param_name in param_names:
            func_body_new = re.sub(rf'\bparams\.{param_name}\b', param_name, func_body_new)
        
        return new_content[:func_start_new] + func_body_new + new_content[func_end_new:]
    
    # Apply replacements
    new_content = re.sub(pattern, replace_function, content, flags=re.MULTILINE)
    
    if new_content != original_content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        return True
    return False

def find_function_end(content, start_pos):
    """Find the end of a function starting at start_pos"""
    brace_count = 0
    in_string = False
    string_char = None
    i = start_pos
    
    while i < len(content):
        char = content[i]
        prev_char = content[i - 1] if i > 0 else ''
        
        if not in_string and char in ('"', "'", '`'):
            in_string = True
            string_char = char
        elif in_string and char == string_char and prev_char != '\\':
            in_string = False
            string_char = None
        
        if not in_string:
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0:
                    return i + 1
        
        i += 1
    
    return len(content)

if __name__ == '__main__':
    import subprocess
    
    # Find all route.ts files
    result = subprocess.run(['find', 'app/api', '-name', 'route.ts', '-type', 'f'], 
                          capture_output=True, text=True)
    files = result.stdout.strip().split('\n')
    files = [f for f in files if f]
    
    fixed = 0
    for file_path in files:
        try:
            if fix_route_file(file_path):
                print(f"Fixed: {file_path}")
                fixed += 1
        except Exception as e:
            print(f"Error fixing {file_path}: {e}", file=sys.stderr)
    
    print(f"\nFixed {fixed} files.")
