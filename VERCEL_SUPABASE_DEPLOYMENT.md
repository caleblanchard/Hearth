# Deploying Hearth to Vercel + Supabase Cloud

**Complete Step-by-Step Guide**

This guide walks you through deploying Hearth as a cloud-hosted SaaS application using Vercel (for the Next.js app) and Supabase Cloud (for database, authentication, and storage).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Create Supabase Project](#step-1-create-supabase-project)
4. [Step 2: Configure Database Schema](#step-2-configure-database-schema)
5. [Step 3: Configure Supabase Authentication](#step-3-configure-supabase-authentication)
6. [Step 4: Get Supabase Credentials](#step-4-get-supabase-credentials)
7. [Step 5: Prepare Your Repository](#step-5-prepare-your-repository)
8. [Step 6: Deploy to Vercel](#step-6-deploy-to-vercel)
9. [Step 7: Configure Environment Variables](#step-7-configure-environment-variables)
10. [Step 8: Verify Deployment](#step-8-verify-deployment)
11. [Step 9: Configure Custom Domain (Optional)](#step-9-configure-custom-domain-optional)
12. [Step 10: Set Up OAuth Providers (Optional)](#step-10-set-up-oauth-providers-optional)
13. [Step 11: Enable Push Notifications (Optional)](#step-11-enable-push-notifications-optional)
14. [Monitoring & Maintenance](#monitoring--maintenance)
15. [Troubleshooting](#troubleshooting)
16. [Cost Estimation](#cost-estimation)

---

## Prerequisites

Before you begin, ensure you have:

- **GitHub Account** - Your code needs to be in a GitHub repository
- **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free tier available)
- **Supabase Account** - Sign up at [supabase.com](https://supabase.com) (free tier available)
- **Git** - Installed on your local machine
- **Node.js 18+** - For local testing (optional but recommended)

**Time Estimate:** 30-45 minutes for first deployment

---

## Architecture Overview

```
┌─────────────┐
│   Browser   │ ← Users access your app
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│           Vercel Edge Network       │ ← Global CDN
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Next.js Application       │   │
│  │   • Server Components       │   │
│  │   • API Routes              │   │
│  │   • Server Actions          │   │
│  │   • Middleware (Auth)       │   │
│  └──────────┬──────────────────┘   │
└─────────────┼──────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│       Supabase Cloud Platform       │
│                                     │
│  ┌──────────────────────────────┐   │
│  │   PostgreSQL Database        │   │
│  │   • Family data              │   │
│  │   • Row Level Security (RLS) │   │
│  │   • Automated backups        │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │   Authentication Service     │   │
│  │   • Email/Password           │   │
│  │   • OAuth (Google, Apple)    │   │
│  │   • Magic Links              │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │   Storage                    │   │
│  │   • Avatars, recipe images   │   │
│  │   • File uploads             │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Key Benefits:**
- ✅ **Zero server maintenance** - Fully managed infrastructure
- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Global CDN** - Fast worldwide access
- ✅ **Automated backups** - Daily database backups
- ✅ **99.9% uptime SLA** - Production-grade reliability

---

## Step 1: Create Supabase Project

### 1.1 Sign Up for Supabase

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email address

### 1.2 Create a New Project

1. Click **"New Project"** from your dashboard
2. Select your organization (or create one)
3. Configure your project:
   
   | Field | Value | Notes |
   |-------|-------|-------|
   | **Name** | `hearth-production` | Or your preferred name |
   | **Database Password** | Generate a strong password | ⚠️ **SAVE THIS!** You'll need it later |
   | **Region** | Choose closest to your users | e.g., `US East (N. Virginia)` |
   | **Pricing Plan** | Free (to start) | Can upgrade later |

4. Click **"Create new project"**
5. Wait 2-3 minutes for provisioning to complete

### 1.3 Save Your Project Details

Once created, note down:
- **Project Reference ID** (e.g., `abcdefghijklmnop`)
- **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)

---

## Step 2: Configure Database Schema

### 2.1 Access SQL Editor

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 2.2 Run Migrations

You need to run each migration file in order. The migration files are located in your repository at `supabase/migrations/`.

#### Migration 1: Initial Schema

1. Open `supabase/migrations/00001_initial_schema.sql` from your repository
2. Copy the **entire contents** of the file
3. Paste into the SQL Editor in Supabase
4. Click **"Run"** (or press `Cmd/Ctrl + Enter`)
5. Verify "Success. No rows returned" appears

#### Migration 2: Module Tables

1. Open `supabase/migrations/00002_module_tables.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

#### Migration 3: RLS Functions

1. Open `supabase/migrations/00003_rls_functions.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

#### Migration 4: RLS Policies

1. Open `supabase/migrations/00004_rls_policies.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

#### Migration 5: Indexes

1. Open `supabase/migrations/00005_additional_indexes.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

#### Migration 6: Family Members RLS Fix

1. Open `supabase/migrations/00006_fix_family_members_rls.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

#### Migration 7: Chore RLS Fix

1. Open `supabase/migrations/20260113131925_fix_chore_rls_stack_overflow.sql`
2. Copy and paste contents into SQL Editor
3. Click **"Run"**
4. Verify success

### 2.3 Verify Tables Created

1. Click **"Table Editor"** in the left sidebar
2. You should see tables including:
   - `families`
   - `family_members`
   - `chore_definitions`
   - `chore_assignments`
   - `meal_plans`
   - `recipes`
   - And many more...

---

## Step 3: Configure Supabase Authentication

### 3.1 Configure Email Settings

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Click on **"Email"**
3. Enable these options:
   - ✅ **Enable Email provider**
   - ✅ **Confirm email** (recommended for production)
   - ✅ **Enable email confirmations**
4. **Site URL**: You'll update this after deploying to Vercel (initially use `http://localhost:3000`)
5. **Redirect URLs**: Add these (update after Vercel deployment):
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback` (add after deployment)

### 3.2 Configure Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - Confirm signup
   - Invite user
   - Magic Link
   - Reset password
3. Use your app name and branding

### 3.3 Security Settings

1. Go to **Authentication** → **Policies** (or **Settings**)
2. Configure:
   - **JWT expiry**: 3600 seconds (1 hour)
   - **Refresh token rotation**: Enabled
   - **Password requirements**: Minimum 8 characters

---

## Step 4: Get Supabase Credentials

You'll need three pieces of information from Supabase:

### 4.1 Project URL

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy **Project URL**
   - Format: `https://abcdefghijklmnop.supabase.co`
   - Save as: `NEXT_PUBLIC_SUPABASE_URL`

### 4.2 Anon/Public Key

1. Still in **Settings** → **API**
2. Under **Project API keys**, copy **anon public**
   - This is a long JWT token (safe to expose in browser)
   - Save as: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4.3 Service Role Key

1. Still in **Settings** → **API**
2. Copy **service_role**
   - ⚠️ **KEEP THIS SECRET!** Never commit to Git or expose in browser
   - Used for admin operations that bypass RLS
   - Save as: `SUPABASE_SERVICE_ROLE_KEY`

**Save these three values** - you'll need them for Vercel configuration.

---

## Step 5: Prepare Your Repository

### 5.1 Ensure Code is in GitHub

```bash
# Check if you have a remote repository
git remote -v

# If not, create a GitHub repository and push
git remote add origin https://github.com/yourusername/hearth.git
git branch -M main
git push -u origin main
```

### 5.2 Verify Environment Variables Are Not Committed

Check that `.env` and `.env.local` are in `.gitignore`:

```bash
grep -E "^\.env" .gitignore
```

Should show:
```
.env
.env.local
.env.production
```

### 5.3 Check Build Succeeds Locally (Optional)

```bash
npm install
npm run build
```

Fix any TypeScript errors or build issues before deploying.

---

## Step 6: Deploy to Vercel

### 6.1 Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Choose **"Continue with GitHub"** (recommended)
4. Authorize Vercel to access your GitHub account

### 6.2 Import Your Repository

1. From your Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your `hearth` repository in the list
3. Click **"Import"**

### 6.3 Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |
| **Root Directory** | `./` |

**Do NOT click "Deploy" yet!** First, configure environment variables.

---

## Step 7: Configure Environment Variables

### 7.1 Add Environment Variables in Vercel

In the Vercel project configuration screen (before deploying), scroll down to **"Environment Variables"**.

Add the following variables:

#### Required Variables

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key | Production, Preview, Development |
| `NODE_ENV` | `production` | Production only |

#### Optional Variables (Recommended)

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Add after first deployment |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Your VAPID public key | For push notifications |
| `VAPID_PRIVATE_KEY` | Your VAPID private key | For push notifications |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` | For push notifications |

**How to add variables:**
1. Enter the **Key** (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
2. Enter the **Value**
3. Select environments (typically check all three)
4. Click **"Add"**
5. Repeat for each variable

### 7.2 Generate VAPID Keys (Optional - For Push Notifications)

If you want push notifications:

```bash
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key:  BL...
Private Key: XY...
```

Add these as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

---

## Step 8: Deploy to Vercel

### 8.1 Start Deployment

1. After adding environment variables, click **"Deploy"**
2. Vercel will:
   - Clone your repository
   - Install dependencies
   - Run `npm run build`
   - Deploy to their global CDN
3. Wait 3-7 minutes for initial deployment

### 8.2 Monitor Build

You can watch the build logs in real-time:
- Click on the deployment in progress
- View **"Building"** logs
- Check for any errors

### 8.3 Deployment Success

When complete, you'll see:
- ✅ **"Deployment Ready"**
- Your production URL: `https://hearth-xyz123.vercel.app`
- Preview image of your site

### 8.4 Update Supabase Redirect URLs

Now that you have your Vercel URL:

1. Go back to **Supabase** → **Authentication** → **URL Configuration**
2. Update **Site URL** to your Vercel URL (e.g., `https://hearth-xyz123.vercel.app`)
3. Add to **Redirect URLs**:
   - `https://hearth-xyz123.vercel.app/auth/callback`
   - Keep `http://localhost:3000/auth/callback` for local development
4. Click **"Save"**

### 8.5 Update Vercel Environment Variable

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add or update `NEXT_PUBLIC_APP_URL`:
   - Key: `NEXT_PUBLIC_APP_URL`
   - Value: `https://hearth-xyz123.vercel.app`
3. **Redeploy** your app to apply this change:
   - Go to **Deployments**
   - Click "..." menu on latest deployment
   - Click **"Redeploy"**

---

## Step 9: Verify Deployment

### 9.1 Test Authentication

1. Visit your Vercel URL (e.g., `https://hearth-xyz123.vercel.app`)
2. Click **"Sign Up"**
3. Create a new account:
   - Enter email
   - Create password
   - Click "Create Account"
4. Check your email for confirmation (if enabled)
5. Confirm email and sign in

### 9.2 Test Family Creation

1. After signing in, you should see the onboarding flow
2. Create your first family:
   - Family name
   - Time zone
   - Location (optional)
3. Add family members (parents, kids)
4. Complete setup

### 9.3 Test Core Features

Verify these work:
- ✅ **Dashboard** loads
- ✅ **Navigation** works
- ✅ **Create a chore** and assign it
- ✅ **Add a meal plan** for the week
- ✅ **Create a to-do item**
- ✅ **Sign out** and **sign back in**

### 9.4 Check Vercel Logs

Monitor for errors:
1. Go to Vercel Dashboard → Your Project → **"Logs"**
2. Filter by **"Errors"**
3. Check for any issues

### 9.5 Check Supabase Logs

1. Go to Supabase Dashboard → **"Logs"**
2. Check **"Postgres Logs"** for database errors
3. Check **"Auth Logs"** for authentication issues

---

## Step 10: Configure Custom Domain (Optional)

### 10.1 Add Domain in Vercel

1. In Vercel, go to your project → **Settings** → **Domains**
2. Click **"Add"**
3. Enter your domain (e.g., `hearth.yourdomain.com`)
4. Vercel will provide DNS configuration instructions

### 10.2 Update DNS Records

In your domain registrar (e.g., Namecheap, Cloudflare, GoDaddy):

**For a subdomain (e.g., hearth.yourdomain.com):**
- Add a **CNAME** record:
  - Name: `hearth`
  - Value: `cname.vercel-dns.com`

**For an apex domain (e.g., yourdomain.com):**
- Add an **A** record:
  - Name: `@`
  - Value: `76.76.21.21`

### 10.3 Wait for DNS Propagation

- DNS changes take 5 minutes to 48 hours
- Check status in Vercel → Domains
- When ready, Vercel auto-provisions SSL certificate

### 10.4 Update Supabase URLs

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Update **Site URL**: `https://hearth.yourdomain.com`
3. Add to **Redirect URLs**: `https://hearth.yourdomain.com/auth/callback`
4. Save

### 10.5 Update Vercel Environment Variable

1. Update `NEXT_PUBLIC_APP_URL` to your custom domain
2. Redeploy

---

## Step 11: Set Up OAuth Providers (Optional)

### 11.1 Google OAuth

#### Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Configure:
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`

#### Configure in Supabase

1. Go to Supabase → **Authentication** → **Providers**
2. Click **"Google"**
3. Enable and add:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
4. Save

#### Test

1. Visit your app
2. Click "Sign in with Google"
3. Verify OAuth flow works

### 11.2 Apple OAuth (Similar Process)

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a Service ID
3. Configure redirect URI
4. Add to Supabase → Authentication → Providers → Apple

---

## Step 12: Enable Push Notifications (Optional)

### 12.1 Verify VAPID Keys Are Set

Ensure these environment variables are configured in Vercel:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### 12.2 Configure Service Worker

The service worker should be automatically available at `/sw.js` after deployment.

### 12.3 Test Push Notifications

1. Sign in to your app
2. Go to Settings → Notifications
3. Click "Enable Notifications"
4. Allow browser notification permission
5. Test by creating a chore assignment (should trigger notification)

---

## Monitoring & Maintenance

### Vercel Monitoring

**View Metrics:**
- Go to your project → **Analytics**
- See page views, bandwidth, function calls

**View Logs:**
- **Runtime Logs**: See errors and console output
- **Build Logs**: See deployment history

**Set Up Alerts:**
- Go to **Settings** → **Notifications**
- Enable email alerts for deployment failures

### Supabase Monitoring

**Database Health:**
- **Dashboard** → Overview shows:
  - Database size
  - Active connections
  - API requests
  - Auth events

**Query Performance:**
- Use **Reports** to see slow queries
- Add indexes if needed

**Backups:**
- Supabase automatically backs up daily (Free tier: 7 days retention)
- Go to **Database** → **Backups** to restore if needed

### Automated Deployments

Vercel automatically deploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Add new feature"
git push origin main

# Vercel auto-deploys in ~3-5 minutes
```

### Manual Rollback

If a deployment breaks something:

1. Go to Vercel → **Deployments**
2. Find the last working deployment
3. Click **"..."** → **"Promote to Production"**

---

## Troubleshooting

### Problem: "Invalid JWT" or "Auth session missing"

**Cause:** Environment variables not set correctly

**Fix:**
1. Verify in Vercel → Settings → Environment Variables
2. Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
3. Redeploy after fixing

### Problem: "Database connection failed"

**Cause:** RLS policies blocking access, or migrations not run

**Fix:**
1. Check Supabase → Logs → Postgres Logs for errors
2. Verify all migrations ran successfully
3. Test RLS policies in SQL Editor:
   ```sql
   SELECT * FROM families WHERE id = 'some-family-id';
   ```

### Problem: "Build failed" in Vercel

**Cause:** TypeScript errors or missing dependencies

**Fix:**
1. Check Vercel build logs for specific error
2. Test build locally: `npm run build`
3. Fix TypeScript errors
4. Push fix to GitHub (auto-redeploys)

### Problem: "Redirect URI mismatch" during OAuth

**Cause:** Supabase redirect URLs not configured

**Fix:**
1. Go to Supabase → Authentication → URL Configuration
2. Add your Vercel URL to Redirect URLs
3. Format: `https://your-app.vercel.app/auth/callback`

### Problem: Emails not sending

**Cause:** Supabase email settings not configured

**Fix:**
1. Go to Supabase → Authentication → Email Templates
2. Verify SMTP settings (or use Supabase's default)
3. Check spam folder
4. For production, set up custom SMTP (SendGrid, Mailgun)

### Problem: Push notifications not working

**Cause:** VAPID keys not set or service worker not registered

**Fix:**
1. Verify VAPID environment variables in Vercel
2. Check browser console for service worker errors
3. Ensure HTTPS (required for push notifications)
4. Test service worker at `/sw.js`

### Problem: Slow performance

**Cause:** Missing database indexes or inefficient queries

**Fix:**
1. Check Supabase → Reports for slow queries
2. Add indexes:
   ```sql
   CREATE INDEX idx_chores_family ON chore_definitions(family_id);
   ```
3. Use Vercel Analytics to identify slow pages

---

## Cost Estimation

### Free Tier Limits

**Supabase (Free):**
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth per month
- Unlimited API requests
- 50,000 monthly active users
- Daily backups (7-day retention)

**Vercel (Hobby - Free):**
- 100 GB bandwidth per month
- Unlimited deployments
- 1000 GB-hours of serverless function execution
- Automatic HTTPS
- Preview deployments

### Estimated Costs for Production

For a family app with ~100 active families:

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| **Supabase** | Pro | $25/month |
| **Vercel** | Pro | $20/month |
| **Total** | | **$45/month** |

**What you get:**
- Unlimited database size (8 GB included, $0.125/GB after)
- 250 GB bandwidth (Vercel)
- 50 GB file storage (Supabase)
- Email support
- 14-day backups
- Custom SMTP
- Team collaboration

### When to Upgrade

**Upgrade Supabase when:**
- Database exceeds 500 MB
- Need more than 7-day backup retention
- Want custom SMTP for emails
- Need priority support

**Upgrade Vercel when:**
- Bandwidth exceeds 100 GB/month
- Need team collaboration features
- Want password-protected preview deployments
- Need advanced analytics

---

## Next Steps After Deployment

### Immediate

1. ✅ Test all core features work
2. ✅ Invite family members to beta test
3. ✅ Monitor logs for errors
4. ✅ Set up uptime monitoring (e.g., [UptimeRobot](https://uptimerobot.com/))

### Within 1 Week

5. ✅ Configure custom domain (optional)
6. ✅ Set up OAuth providers (Google, Apple)
7. ✅ Customize email templates in Supabase
8. ✅ Enable push notifications
9. ✅ Set up error tracking (e.g., Sentry)

### Within 1 Month

10. ✅ Review analytics and usage patterns
11. ✅ Optimize slow queries
12. ✅ Set up automated database backups to external storage
13. ✅ Create a status page (e.g., [StatusPage.io](https://www.statuspage.io/))
14. ✅ Plan for scaling (if needed)

---

## Additional Resources

### Documentation

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

### Support

- **Supabase Discord**: [discord.supabase.com](https://discord.supabase.com)
- **Vercel Community**: [vercel.com/community](https://vercel.com/community)
- **GitHub Issues**: [github.com/yourusername/hearth/issues](https://github.com/yourusername/hearth/issues)

### Tools

- **Supabase CLI**: For local development and migrations
- **Vercel CLI**: For local preview and debugging
- **Postman**: For API testing
- **pgAdmin**: For advanced database management

---

## Security Best Practices

### Before Going Live

- [ ] Review all RLS policies
- [ ] Audit environment variables (no secrets in public variables)
- [ ] Enable email confirmation for signups
- [ ] Set up rate limiting (Supabase has built-in limits)
- [ ] Review CORS settings
- [ ] Enable database SSL (enabled by default in Supabase)
- [ ] Set up WAF rules in Vercel (Pro plan)

### Ongoing

- [ ] Regularly update dependencies (`npm audit`, `npm update`)
- [ ] Monitor auth logs for suspicious activity
- [ ] Review and rotate service role keys periodically
- [ ] Keep Supabase and Vercel plans up to date
- [ ] Subscribe to security advisories for Next.js and Supabase

---

## Conclusion

You now have a fully functional, production-ready deployment of Hearth on Vercel and Supabase Cloud! 🎉

**Key Benefits of This Setup:**
- ✅ Zero server maintenance
- ✅ Automatic scaling
- ✅ Global CDN for fast access
- ✅ Built-in authentication and database
- ✅ Automated backups
- ✅ Easy updates via Git push

**Need Help?**
- Check the [Troubleshooting](#troubleshooting) section
- Review [Supabase Docs](https://supabase.com/docs)
- Open an issue on [GitHub](https://github.com/yourusername/hearth/issues)

---

**Last Updated:** January 14, 2026  
**Version:** 1.0  
**Compatible with:** Next.js 16.1.1, Supabase (latest), Vercel (latest)
