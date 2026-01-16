#!/bin/bash

# NextAuth to Supabase Auth Migration Script
# Automatically updates import statements in client components

echo "🔄 Migrating NextAuth to Supabase Auth..."
echo "========================================"

# Find all files using next-auth/react (excluding tests and backups)
files=$(find components app -name "*.tsx" -type f -exec grep -l "from 'next-auth/react'" {} \; | grep -v test | grep -v backup)

count=0
for file in $files; do
  echo "📝 Updating: $file"
  
  # Replace import statements
  # Pattern 1: import { useSession } from 'next-auth/react'
  sed -i '' "s/import { useSession } from 'next-auth\/react'/import { useSupabaseSession } from '@\/hooks\/useSupabaseSession'/g" "$file"
  
  # Pattern 2: import { useSession, signOut } from 'next-auth/react'
  sed -i '' "s/import { useSession, signOut } from 'next-auth\/react'/import { useSupabaseSession, signOut } from '@\/hooks\/useSupabaseSession'/g" "$file"
  
  # Pattern 3: import { signOut } from 'next-auth/react'
  sed -i '' "s/import { signOut } from 'next-auth\/react'/import { signOut } from '@\/hooks\/useSupabaseSession'/g" "$file"
  
  # Pattern 4: import { signIn } from 'next-auth/react'
  sed -i '' "s/import { signIn } from 'next-auth\/react'/import { createClient } from '@\/lib\/supabase\/client'/g" "$file"
  
  # Replace hook usage
  # const { data: session, status } = useSession()
  sed -i '' 's/const { data: session, status } = useSession()/const { user, loading } = useSupabaseSession()/g' "$file"
  
  # const { data: session } = useSession()
  sed -i '' 's/const { data: session } = useSession()/const { user } = useSupabaseSession()/g' "$file"
  
  # session?.user -> user
  sed -i '' 's/session?.user/user/g' "$file"
  
  # session.user -> user
  sed -i '' 's/session\.user/user/g' "$file"
  
  # status === 'loading' -> loading
  sed -i '' "s/status === 'loading'/loading/g" "$file"
  
  # status === 'authenticated' -> !loading && user
  sed -i '' "s/status === 'authenticated'/!loading \&\& user/g" "$file"
  
  count=$((count + 1))
done

echo ""
echo "✅ Updated $count files"
echo ""
echo "⚠️  Manual review needed for:"
echo "  - signIn() calls (need to use supabase.auth.signInWithPassword)"
echo "  - Complex session logic"
echo "  - Role/family access (need to query family_members table)"
echo ""
echo "📝 Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Test app: npm run dev"
echo "  3. Fix any remaining issues"
echo "  4. Run tests: npm test"
