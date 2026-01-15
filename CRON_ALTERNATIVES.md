# Cron Job Alternatives for Vercel Hobby Plan

**Issue:** Vercel Hobby (free) plan does not support cron jobs. Cron jobs require a Pro plan ($20/month).

---

## Scheduled Tasks in Hearth

The application has three cron jobs that need to run periodically:

| Task | Schedule | Purpose |
|------|----------|---------|
| Generate Chore Instances | Daily at midnight | Creates daily chore assignments |
| Distribute Allowances | Daily at 1 AM | Processes allowance distributions |
| Sync External Calendars | Every hour | Syncs with Google Calendar |

---

## Solution Options

### Option 1: Upgrade to Vercel Pro (Recommended for Production)

**Cost:** $20/month  
**Pros:**
- Native cron support
- No external dependencies
- Reliable execution
- Integrated logging

**Setup:**
1. Upgrade to Vercel Pro plan
2. Rename `vercel.json.pro` to `vercel.json`
3. Redeploy

### Option 2: External Cron Service (Free Alternatives)

Use a free external service to trigger your API endpoints:

#### A. GitHub Actions (Free for Public Repos)

Create `.github/workflows/cron-jobs.yml`:

```yaml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
    - cron: '0 1 * * *'  # Daily at 1 AM UTC
    - cron: '0 * * * *'  # Every hour

jobs:
  run-crons:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Chore Instances
        if: github.event.schedule == '0 0 * * *'
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/generate-chore-instances \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Distribute Allowances
        if: github.event.schedule == '0 1 * * *'
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/distribute-allowances \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
      
      - name: Sync External Calendars
        if: github.event.schedule == '0 * * * *'
        run: |
          curl -X POST https://your-app.vercel.app/api/cron/sync-external-calendars \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

**Setup:**
1. Add `CRON_SECRET` to GitHub repository secrets
2. Add `CRON_SECRET` to Vercel environment variables
3. Protect cron endpoints with secret validation
4. Commit workflow file

**Pros:**
- Free for public repositories
- Reliable
- Easy to set up
- Logs available in GitHub Actions

**Cons:**
- Requires public repository (or GitHub Pro)
- Separate logging location

#### B. EasyCron (Free Tier: 5 URLs)

**URL:** https://www.easycron.com/

**Free Plan:**
- 5 cron jobs
- Every 30 minutes minimum

**Setup:**
1. Sign up for EasyCron
2. Create 3 cron jobs pointing to:
   - `https://your-app.vercel.app/api/cron/generate-chore-instances`
   - `https://your-app.vercel.app/api/cron/distribute-allowances`
   - `https://your-app.vercel.app/api/cron/sync-external-calendars`
3. Set schedules
4. Add authorization headers

**Pros:**
- Easy to set up
- Web UI for management

**Cons:**
- External dependency
- 30-minute minimum interval (can't do hourly calendar sync exactly on the hour)

#### C. cron-job.org (Free Tier: 3 URLs)

**URL:** https://cron-job.org/

**Free Plan:**
- 3 cron jobs
- 1-minute intervals

**Setup:**
1. Sign up for cron-job.org
2. Create jobs for each endpoint
3. Configure schedules and headers

**Pros:**
- Completely free
- 1-minute precision
- Email notifications on failures

**Cons:**
- Limited to 3 jobs (perfect for our use case)
- External dependency

#### D. Render.com Cron Jobs (Free)

**URL:** https://render.com/

**Setup:**
1. Create a Render account
2. Deploy a simple cron service:

```javascript
// server.js
const express = require('express');
const axios = require('axios');
const app = express();

const VERCEL_URL = process.env.VERCEL_URL;
const CRON_SECRET = process.env.CRON_SECRET;

// Trigger all crons on a schedule
setInterval(async () => {
  const hour = new Date().getUTCHours();
  
  // Midnight: Generate chores
  if (hour === 0) {
    await axios.post(`${VERCEL_URL}/api/cron/generate-chore-instances`, {}, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
  }
  
  // 1 AM: Distribute allowances
  if (hour === 1) {
    await axios.post(`${VERCEL_URL}/api/cron/distribute-allowances`, {}, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
  }
  
  // Every hour: Sync calendars
  await axios.post(`${VERCEL_URL}/api/cron/sync-external-calendars`, {}, {
    headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
  });
}, 3600000); // Every hour

app.listen(3000);
```

**Pros:**
- Free tier available
- You control the code
- Reliable

**Cons:**
- Need to maintain separate service

### Option 3: Client-Side Scheduling (Not Recommended)

Trigger crons from Next.js middleware on user visits.

**Pros:**
- No external dependencies
- Free

**Cons:**
- Unreliable (requires user traffic)
- May not run if no users visit
- Performance impact
- Not suitable for time-critical tasks

---

## Recommended Approach

### For Development/Testing
Use **GitHub Actions** (Option 2A) - Free and reliable

### For Production
Use **Vercel Pro** (Option 1) - Best integration and reliability

### For Small Deployments
Use **cron-job.org** (Option 2C) - Free, simple, works well for 3 jobs

---

## Securing Cron Endpoints

Whichever option you choose, protect your cron endpoints:

### 1. Add Environment Variable

In Vercel dashboard, add:
```
CRON_SECRET=your-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### 2. Update Cron Route Handlers

Update each cron route to validate the secret:

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
  // ...
  
  return NextResponse.json({ success: true });
}

// For Vercel's native cron (Pro plan), also allow verification token
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return POST(request);
}
```

---

## Migration Path

### Current State (Hobby Plan)
1. Remove `crons` from `vercel.json` ✓
2. Choose temporary solution (GitHub Actions or cron-job.org)
3. Deploy successfully

### When Ready for Production
1. Upgrade to Vercel Pro
2. Copy `vercel.json.pro` to `vercel.json`
3. Redeploy
4. Remove external cron service

---

## Testing Cron Jobs Manually

You can test cron endpoints manually:

```bash
# Generate chore instances
curl -X POST https://your-app.vercel.app/api/cron/generate-chore-instances \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Distribute allowances
curl -X POST https://your-app.vercel.app/api/cron/distribute-allowances \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Sync external calendars
curl -X POST https://your-app.vercel.app/api/cron/sync-external-calendars \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Further Reading

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [GitHub Actions Schedule Syntax](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)
- [Vercel Pricing](https://vercel.com/pricing)

---

**Last Updated:** January 15, 2026  
**Status:** Ready for deployment on Vercel Hobby plan (crons disabled)
