# Supabase Local Development Setup

**Status:** ✅ Running  
**Started:** January 9, 2026

## Connection Details

### Development Tools
- **Studio UI:** http://127.0.0.1:54323
- **Mailpit (Email testing):** http://127.0.0.1:54324
- **MCP:** http://127.0.0.1:54321/mcp

### API Endpoints
- **Project URL:** http://127.0.0.1:54321
- **REST API:** http://127.0.0.1:54321/rest/v1
- **GraphQL:** http://127.0.0.1:54321/graphql/v1
- **Edge Functions:** http://127.0.0.1:54321/functions/v1

### Database
- **Connection URL:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Port:** 54322
- **User:** postgres
- **Password:** postgres

### Authentication Keys
- **Publishable Key:** `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- **Secret Key:** `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`

### S3 Storage
- **URL:** http://127.0.0.1:54321/storage/v1/s3
- **Access Key:** 625729a08b95bf1b7ff351a663f3a23c
- **Secret Key:** 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
- **Region:** local

---

## Environment Variables

Add these to your `.env.local` file:

```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH
SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

---

## Useful Commands

```bash
# Start Supabase (already running)
supabase start

# Stop Supabase
supabase stop

# Reset database (WARNING: deletes all data)
supabase db reset

# Create a new migration
supabase migration new <migration_name>

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > lib/database.types.ts

# View logs
supabase logs

# Check status
supabase status
```

---

## Next Steps

1. ✅ Supabase initialized
2. ✅ Local Supabase running
3. ✅ Connection details documented
4. 🔄 **Next:** Create test infrastructure (Phase 2)
