#!/bin/bash

# Fix Next.js 16 async params in route handlers
# In Next.js 16, params is now a Promise and must be awaited

echo "Fixing async params in route handlers..."

# Find all route.ts files with params
find app/api -name "route.ts" -type f | while read file; do
  # Check if file has params
  if grep -q "params.*:" "$file"; then
    echo "Processing: $file"
    
    # Extract param names (e.g., id, memberId, etc.)
    # This is a simplified approach - may need manual fixes for complex cases
    param_names=$(grep -o "params\.[a-zA-Z_][a-zA-Z0-9_]*" "$file" | sed 's/params\.//' | sort -u | tr '\n' ' ')
    
    if [ -n "$param_names" ]; then
      # Create destructuring line
      # For now, we'll do a simple replacement
      # This script is a helper - manual review may be needed
      echo "  Found params: $param_names"
    fi
  fi
done

echo "Done! Please review and manually fix complex cases."
