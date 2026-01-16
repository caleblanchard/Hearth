# How to Clean Up Test User and Retry Onboarding

**Error:** `User already registered`

This happens when you've already created a Supabase Auth user during testing but didn't complete the full onboarding flow.

---

## Quick Solution

### Option 1: Use a Different Email

The fastest solution is to use a different email address for testing:

```
# Try with a different email
test2@example.com
test3@example.com
yourname+test1@gmail.com  # Gmail ignores everything after +
```

### Option 2: Clean Up in Supabase Dashboard

If you want to reuse the same email, you need to delete the auth user:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Delete Auth User**
   - Go to **Authentication** → **Users** in the left sidebar
   - Find the user with your test email
   - Click the **3 dots** (⋯) on the right
   - Click **Delete user**
   - Confirm deletion

3. **Clear Local Storage** (important!)
   ```bash
   # In your browser DevTools (F12)
   # Go to: Application → Storage → Clear site data
   # Or just: localStorage.clear()
   ```

4. **Retry Onboarding**
   - Visit: http://localhost:3000/onboarding
   - Use the same email now that it's been deleted

### Option 3: Use SQL to Clean Up (Advanced)

If you have direct database access:

```sql
-- Delete from auth.users (this cascades to family_members)
DELETE FROM auth.users WHERE email = 'your@email.com';

-- If family was created, clean it up too
DELETE FROM families WHERE name = 'Your Test Family';
```

---

## Why This Happens

During onboarding, the process is:
1. ✅ Create Supabase Auth user (succeeds)
2. ❌ Create family (if this fails, you're stuck)
3. ❌ Create family_member (not reached)

If step 2 or 3 fails, the auth user exists but has no family, so you can't log in or retry.

---

## Prevention

For development, use throwaway email addresses:

```bash
# Gmail trick: All these go to the same inbox
yourname+test1@gmail.com
yourname+test2@gmail.com
yourname+test3@gmail.com
yourname+hearth-dev@gmail.com
```

Or use a temp email service:
- https://temp-mail.org
- https://10minutemail.com
- https://guerrillamail.com

---

## Testing Supabase Auth Locally

If you want to test without hitting production Supabase, you can:

1. **Set up local Supabase** (recommended for heavy testing)
   ```bash
   npx supabase init
   npx supabase start
   
   # Update .env.local with local URLs
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
   ```

2. **Use Supabase Studio**
   - Local: http://localhost:54323
   - Easily view/delete test users

---

## Current Workaround

Since you're seeing this error, here's what to do **right now**:

### Quickest Fix
```bash
# Use a different email in the onboarding form
# Format: yourname+NUMBER@gmail.com

# Examples:
cblanchard+test1@gmail.com
cblanchard+test2@gmail.com
cblanchard+hearth@gmail.com
```

All these emails will deliver to `cblanchard@gmail.com` but Supabase treats them as different users!

---

## After You Complete Onboarding

Once onboarding succeeds:
- ✅ You'll be signed in automatically
- ✅ You'll see the dashboard
- ✅ You can start using the app

If you want to test onboarding again:
- Use Option 1 (different email) - Fastest
- Or Option 2 (delete in dashboard) - Clean

---

## Future Improvement

We could add:
- Better rollback on failure (delete auth user if family creation fails)
- Admin panel to clean up orphaned users
- Development mode with easy reset

For now, use **Option 1** (different email) for testing! 🚀

---

**Last Updated:** January 10, 2026  
**Quick Fix:** Use `yourname+test1@gmail.com` format  
**Status:** Workaround available
