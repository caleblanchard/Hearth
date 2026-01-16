# Hearth Deployment Guide

## Overview

Hearth supports **two deployment modes** using the **same codebase and same authentication system** (Supabase):

| Mode | Infrastructure | Database | Auth | Best For |
|------|----------------|----------|------|----------|
| **Cloud** | Vercel + Supabase Cloud | Managed PostgreSQL | Supabase Auth (managed) | Public SaaS, zero maintenance |
| **Self-Hosted** | Docker Compose | PostgreSQL container | Supabase Auth (container) | Privacy-focused, on-premise |

**Key Advantage:** Both modes use Supabase, so the codebase is **100% identical**. No auth adapters or dual code paths needed.

---

## Cloud Deployment (Vercel + Supabase Cloud)

### Prerequisites

- [Vercel Account](https://vercel.com) (free tier works)
- [Supabase Account](https://supabase.com) (free tier works)
- [GitHub Account](https://github.com) (for Vercel Git integration)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details:
   - Name: `hearth-production`
   - Database Password: **Save this!** (use a strong password)
   - Region: Choose closest to your users
4. Wait for project to provision (~2 minutes)

### Step 2: Run Database Migrations

1. In your Supabase Dashboard, go to **SQL Editor**
2. Run migrations in order:
   - Copy contents of `supabase/migrations/00001_initial_schema.sql` → Click "RUN"
   - Copy contents of `supabase/migrations/00002_module_tables.sql` → Click "RUN"
   - Copy contents of `supabase/migrations/00003_rls_functions.sql` → Click "RUN"
   - Copy contents of `supabase/migrations/00004_rls_policies.sql` → Click "RUN"
   - Copy contents of `supabase/migrations/00005_additional_indexes.sql` → Click "RUN"

### Step 3: Get Supabase Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Public Key** (long JWT token)
   - **Service Role Key** (long JWT token - **keep secret!**)

### Step 4: Deploy to Vercel

1. Push your code to GitHub
2. Go to [https://vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure **Environment Variables**:

```bash
# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application (REQUIRED)
NODE_ENV=production

# Optional Services
WEATHER_API_KEY=your-openweathermap-key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

5. Click **Deploy**
6. Wait for build to complete (~3-5 minutes)

### Step 5: Configure OAuth (Optional)

If you want Google Sign-In:

1. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. In Supabase Dashboard, go to **Authentication** → **Providers** → **Google**
3. Enable Google and add your credentials
4. Set redirect URL: `https://xxxxx.supabase.co/auth/v1/callback`

### Step 6: Test Deployment

1. Visit your Vercel URL (e.g., `https://hearth.vercel.app`)
2. Click "Sign Up"
3. Create a family account
4. Test basic features (chores, calendar, etc.)

**🎉 You're live!**

---

## Self-Hosted Deployment (Docker Compose)

### Prerequisites

- Linux server with Docker and Docker Compose
- At least 2GB RAM, 20GB disk space
- Domain name (optional, but recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/hearth.git
cd hearth
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.selfhosted.example .env

# Generate JWT secret
openssl rand -hex 32

# Edit .env and set:
# - JWT_SECRET (from above)
# - POSTGRES_PASSWORD (strong password)
# - APP_URL (your domain or http://localhost:3000)
nano .env
```

### Step 3: Generate Supabase API Keys

The Supabase anon and service role keys are JWTs signed with your JWT secret. You can generate them at:

👉 **https://supabase.com/docs/guides/self-hosting/docker#api-keys**

Or use this script:

```bash
# Install dependencies
npm install jsonwebtoken

# Generate keys
node scripts/generate-supabase-keys.js
```

Add the generated keys to your `.env`:

```bash
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### Step 4: Start Services

```bash
# Start all containers
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f hearth
```

Services will be available at:
- **Hearth App:** http://localhost:3000
- **Supabase Studio:** http://localhost:3001 (database management UI)
- **Supabase API:** http://localhost:8000

### Step 5: Run Database Migrations

Option A: Via Supabase Studio (Recommended)

1. Open http://localhost:3001
2. Log in with your Supabase credentials
3. Go to **SQL Editor**
4. Run each migration file in order

Option B: Via Docker

```bash
# Run migrations via psql
for file in supabase/migrations/*.sql; do
  docker compose exec -T supabase-db psql -U postgres -d postgres < "$file"
done
```

### Step 6: Create First User

1. Visit http://localhost:3000
2. Click "Sign Up"
3. Create a family account
4. Check your email for confirmation (if MAILER_AUTOCONFIRM=false)

### Step 7: Configure Reverse Proxy (Optional)

For production, use Nginx or Caddy to:
- Add HTTPS (Let's Encrypt)
- Proxy port 3000 → your domain
- Proxy port 8000 → api.yourdomain.com

Example Caddy configuration:

```
hearth.yourdomain.com {
  reverse_proxy localhost:3000
}

api.hearth.yourdomain.com {
  reverse_proxy localhost:8000
}
```

---

## Deployment Comparison

| Feature | Cloud (Vercel + Supabase) | Self-Hosted (Docker) |
|---------|---------------------------|----------------------|
| **Setup Time** | 15 minutes | 30 minutes |
| **Cost** | Free tier available, then $20-50/mo | Server costs only (~$5-20/mo) |
| **Maintenance** | Zero (fully managed) | Updates, backups, monitoring |
| **Scaling** | Automatic | Manual (add servers) |
| **Data Location** | Supabase's data centers | Your infrastructure |
| **Uptime SLA** | 99.9% (Supabase) | Depends on your setup |
| **Backups** | Automatic daily backups | You configure (e.g., pg_dump) |
| **SSL/HTTPS** | Automatic | You configure (Let's Encrypt) |
| **OAuth** | Pre-configured | Requires manual setup |
| **Code Updates** | Git push → Auto deploy | Git pull, rebuild containers |

---

## Migration Between Modes

### Cloud → Self-Hosted

1. Export database from Supabase Cloud:
   ```bash
   # In Supabase Dashboard → Database → Backups
   # Download backup file
   ```

2. Import to self-hosted:
   ```bash
   docker compose exec -T supabase-db psql -U postgres < backup.sql
   ```

3. Update environment variables to point to self-hosted Supabase

### Self-Hosted → Cloud

1. Export database:
   ```bash
   docker compose exec supabase-db pg_dump -U postgres > backup.sql
   ```

2. Import to Supabase Cloud:
   - Use Supabase Dashboard → SQL Editor
   - Or use `psql` with connection string

3. Update environment variables to point to Supabase Cloud

---

## Monitoring & Maintenance

### Cloud Deployment

**Monitoring:**
- Vercel Dashboard: Build logs, function logs, analytics
- Supabase Dashboard: Database stats, API usage, auth logs

**Maintenance:**
- Automatic platform updates
- Database auto-scaling
- Automated backups

### Self-Hosted Deployment

**Monitoring:**

```bash
# Container health
docker compose ps

# Resource usage
docker stats

# Application logs
docker compose logs -f hearth

# Database size
docker compose exec supabase-db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'))"
```

**Maintenance Tasks:**

1. **Weekly Backups:**
   ```bash
   # Backup script
   docker compose exec supabase-db pg_dump -U postgres > backup-$(date +%Y%m%d).sql
   ```

2. **Updates:**
   ```bash
   git pull
   docker compose pull
   docker compose up -d --build
   ```

3. **Cleanup:**
   ```bash
   # Remove old images
   docker image prune -a

   # View disk usage
   docker system df
   ```

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused" when accessing app

```bash
# Check if containers are running
docker compose ps

# Check logs for errors
docker compose logs hearth
docker compose logs supabase-db
```

#### 2. "Invalid JWT" errors

- Verify `JWT_SECRET` is the same in all services
- Regenerate API keys if JWT_SECRET changed

#### 3. Database connection errors

```bash
# Check database is healthy
docker compose exec supabase-db pg_isready -U postgres

# Check connection string
docker compose logs supabase-rest | grep -i "connection"
```

#### 4. Port conflicts (port already in use)

```bash
# Change ports in .env
APP_PORT=3001
KONG_HTTP_PORT=8001
STUDIO_PORT=3002

# Restart
docker compose down
docker compose up -d
```

### Getting Help

- **Documentation:** [docs/](./docs/)
- **GitHub Issues:** [github.com/yourusername/hearth/issues](https://github.com/yourusername/hearth/issues)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)

---

## Architecture Diagrams

### Cloud Deployment

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│      Vercel         │
│   (Next.js App)     │
│                     │
│  ┌───────────────┐  │
│  │ Server Actions│  │
│  │ API Routes    │  │
│  │ Middleware    │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Cloud     │
│                     │
│  ┌──────────────┐   │
│  │ PostgreSQL   │   │
│  │ + RLS        │   │
│  └──────────────┘   │
│                     │
│  ┌──────────────┐   │
│  │ Auth         │   │
│  │ (GoTrue)     │   │
│  └──────────────┘   │
│                     │
│  ┌──────────────┐   │
│  │ Storage      │   │
│  │ (Files)      │   │
│  └──────────────┘   │
└─────────────────────┘
```

### Self-Hosted Deployment

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│         Docker Host                      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Hearth Container (Next.js)        │  │
│  └──────────────┬─────────────────────┘  │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐  │
│  │  Kong Container (API Gateway)      │  │
│  └──────────────┬─────────────────────┘  │
│                 │                        │
│        ┌────────┴────────┐               │
│        ▼                 ▼               │
│  ┌──────────┐     ┌──────────┐           │
│  │ Auth     │     │ PostgREST│           │
│  │ (GoTrue) │     │          │           │
│  └────┬─────┘     └────┬─────┘           │
│       │                │                 │
│       └────────┬───────┘                 │
│                ▼                         │
│  ┌────────────────────────────────────┐  │
│  │  PostgreSQL Container              │  │
│  │  + Extensions + RLS                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Redis Container (Rate Limiting)   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  MinIO Container (File Storage)    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Next Steps

After deployment:

1. ✅ **Test Core Features** - Signup, login, basic operations
2. ✅ **Configure OAuth** - Add Google/Apple sign-in (optional)
3. ✅ **Set Up Monitoring** - Error tracking, analytics
4. ✅ **Custom Domain** - Point your domain to Vercel/your server
5. ✅ **Invite Users** - Share signup link with family/beta testers
6. ✅ **Backup Strategy** - Automated backups (self-hosted)
7. ✅ **SSL Certificate** - HTTPS for security (self-hosted)

---

**Last Updated:** January 10, 2026  
**Next.js Version:** 16.1.1  
**React Version:** 19.2.3  
**Supabase Compatibility:** ✅ Cloud & Self-Hosted
