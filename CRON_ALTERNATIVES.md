# Calendar Sync Alternatives for Vercel Hobby Plan

**Issue:** Vercel Hobby (free) plan supports daily cron jobs only. The hourly calendar sync needs an alternative solution.

---

## Scheduled Tasks in Hearth

The application has three scheduled tasks:

| Task | Schedule | Vercel Hobby Support |
|------|----------|---------------------|
| Generate Chore Instances | Daily at midnight | ✅ Supported |
| Distribute Allowances | Daily at 1 AM | ✅ Supported |
| Sync External Calendars | Every hour | ❌ Requires Pro or alternative |

---

## What's Configured in vercel.json

✅ **Included (runs on Hobby plan):**
- Generate chore instances (daily at midnight)
- Distribute allowances (daily at 1 AM)

❌ **Excluded (needs alternative):**
- Sync external calendars (hourly)

---

## Options for Hourly Calendar Sync

### Option 1: Upgrade to Vercel Pro

**Cost:** $20/month  
**Pros:**
- Native support for hourly cron
- No external dependencies
- Reliable execution
- Integrated logging

**Setup:**
1. Upgrade to Vercel Pro plan
2. Copy `vercel.json.pro` to replace `vercel.json`
3. Redeploy

---

### Option 2: External Cron Service (Free)

Use a free external service to trigger the calendar sync endpoint hourly:

#### A. cron-job.org (Recommended - Free)

**URL:** https://cron-job.org/

**Free Plan:**
- Unlimited cron jobs
- 1-minute precision
- Email notifications on failures

**Setup:**
1. Sign up for cron-job.org
2. Create a new cron job:
   - **URL:** `https://your-app.vercel.app/api/cron/sync-external-calendars`
   - **Schedule:** `0 * * * *` (every hour on the hour)
   - **Request Method:** POST
   - **Headers:** Add `Authorization: Bearer YOUR_CRON_SECRET`
3. Enable email notifications for failures

**Pros:**
- Completely free
- Very reliable
- Easy web UI
- Email alerts on failures

---

#### B. GitHub Actions (Free for Public Repos)

Create `.github/workflows/calendar-sync.yml`:

```yaml
name: Hourly Calendar Sync

on:
  schedule:
    - cron: '0 * * * *'  # Every hour at minute 0

jobs:
  sync-calendars:
    runs-on: ubuntu-latest
    steps:
      - name: Sync External Calendars
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/sync-external-calendars \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -f || exit 1
```

**Setup:**
1. Add `CRON_SECRET` to GitHub repository secrets
2. Add `CRON_SECRET` to Vercel environment variables
3. Commit workflow file to `.github/workflows/`

**Pros:**
- Free for public repositories
- Reliable
- Built-in logging in GitHub Actions tab

**Cons:**
- Requires public repository (or GitHub Pro)

---

#### C. EasyCron (Free Tier)

**URL:** https://www.easycron.com/

**Free Plan:**
- 1 cron job (perfect!)
- Runs every hour

**Setup:**
1. Sign up for EasyCron
2. Create cron job:
   - **URL:** `https://your-app.vercel.app/api/cron/sync-external-calendars`
   - **Schedule:** Every hour
   - **Method:** POST
   - **Custom Headers:** `Authorization: Bearer YOUR_CRON_SECRET`

---

#### D. UptimeRobot (Creative Solution)

**URL:** https://uptimerobot.com/

**Free Plan:**
- 50 monitors
- 5-minute check intervals

**Setup:**
1. Sign up for UptimeRobot
2. Create a "HTTP(S)" monitor
3. Set URL: `https://your-app.vercel.app/api/cron/sync-external-calendars`
4. Set interval: 5 minutes
5. Add custom header: `Authorization: Bearer YOUR_CRON_SECRET`

**Note:** This will sync every 5 minutes (not hourly). Good for testing or if you want more frequent syncs!

---

### Option 3: On-Demand Sync (No Cron)

Instead of hourly automatic sync, sync when users access calendar:

**Implementation:**
```typescript
// lib/data/calendar.ts
export async function shouldSyncCalendars(familyId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { data: lastSync } = await supabase
    .from('calendar_connections')
    .select('last_synced_at')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .single();
  
  if (!lastSync?.last_synced_at) return true;
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return new Date(lastSync.last_synced_at) < oneHourAgo;
}

// app/dashboard/calendar/page.tsx
export default async function CalendarPage() {
  const { familyId } = await getAuthContext();
  
  // Check if sync needed
  const needsSync = await shouldSyncCalendars(familyId);
  
  if (needsSync) {
    // Trigger sync in background (fire and forget)
    fetch('/api/cron/sync-external-calendars', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    }).catch(() => {}); // Ignore errors
  }
  
  // Load calendar data
  const events = await getCalendarEvents(familyId);
  return <CalendarView events={events} />;
}
```

**Pros:**
- Free
- No external dependencies
- Syncs when actually needed (user-driven)
- Smart throttling (max once per hour)

**Cons:**
- Only syncs when users visit calendar
- First user after 1 hour may experience slight delay

---

## Recommended Approach

### For Hobby Plan (Free)
**Immediate:** Use Vercel's built-in daily crons (chores & allowances) ✓  
**Calendar Sync:** Use **cron-job.org** (free, reliable, 1 job needed)

### For Pro Plan ($20/month)
Use Vercel native crons for all three tasks (copy vercel.json.pro)

### For Development/Testing
Use **on-demand sync** (Option 3) - simplest, no setup needed

---

## Securing Cron Endpoints

Whichever option you choose, protect your cron endpoints:

### 1. Generate CRON_SECRET

```bash
openssl rand -hex 32
```

### 2. Add to Vercel Environment Variables

In Vercel dashboard → Settings → Environment Variables:
```
CRON_SECRET=your-generated-secret-here
```

### 3. Update Cron Routes

All cron routes should validate the secret:

```typescript
// app/api/cron/[route]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Your cron logic here
  try {
    // ... perform task ...
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Testing Cron Jobs Manually

Test cron endpoints locally or in production:

```bash
# Set your secret
export CRON_SECRET="your-secret-here"

# Test locally (http://localhost:3000)
curl -X POST http://localhost:3000/api/cron/generate-chore-instances \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/distribute-allowances \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/cron/sync-external-calendars \
  -H "Authorization: Bearer $CRON_SECRET"

# Test in production
curl -X POST https://your-app.vercel.app/api/cron/generate-chore-instances \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected response:
```json
{"success": true}
```

---

## Monitoring

### Vercel Logs
- View cron execution in Vercel Dashboard → Logs
- Filter by `/api/cron/` to see all cron activity

### External Service Logs
- **cron-job.org:** Dashboard shows execution history and failures
- **GitHub Actions:** Check Actions tab for run history
- **EasyCron:** Execution logs in dashboard

### Email Alerts
Set up email notifications for failures:
- cron-job.org: Built-in email alerts
- GitHub Actions: Configure workflow notifications
- UptimeRobot: Email on monitor down

---

## Further Reading

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Pricing](https://vercel.com/pricing)
- [GitHub Actions Schedule Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

---

**Last Updated:** January 15, 2026  
**Status:** Ready for Vercel Hobby deployment (2 daily crons enabled)
