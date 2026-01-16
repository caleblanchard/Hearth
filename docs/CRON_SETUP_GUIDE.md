# Setting Up Cron Jobs with cron-job.org

Since Vercel Hobby plan has a limit of 2 cron jobs, we'll use cron-job.org (free, unlimited cron jobs) to trigger all three scheduled tasks.

---

## Overview

**What you'll set up:**
- 3 cron jobs on cron-job.org (free)
- Security with a CRON_SECRET environment variable
- Daily execution for all three tasks

**Time required:** 10-15 minutes

---

## Step 1: Generate a CRON_SECRET

First, generate a secure secret to protect your cron endpoints:

```bash
# On macOS/Linux:
openssl rand -hex 32

# Example output (yours will be different):
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Save this value** - you'll need it in the next steps.

---

## Step 2: Add CRON_SECRET to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key:** `CRON_SECRET`
   - **Value:** (paste your generated secret from Step 1)
   - **Environments:** Check all three (Production, Preview, Development)
5. Click **Save**

**Important:** After adding this variable, you need to **redeploy** your app for it to take effect.

---

## Step 3: Sign Up for cron-job.org

1. Go to [https://cron-job.org/](https://cron-job.org/)
2. Click **"Sign up"** (top right)
3. Fill in:
   - Email address
   - Password
   - Username
4. Click **"Create account"**
5. **Verify your email** (check your inbox)
6. Log in to cron-job.org

---

## Step 4: Create Cron Job #1 - Generate Chore Instances

Once logged in to cron-job.org:

### 4.1 Start Creating a Job

1. Click **"Create cronjob"** (big blue button)

### 4.2 Configure Basic Settings

**Title:**
```
Hearth - Generate Chore Instances
```

**Address (URL):**
```
https://YOUR-APP-NAME.vercel.app/api/cron/generate-chore-instances
```
*Replace `YOUR-APP-NAME` with your actual Vercel deployment URL*

**Schedule:**
- Click **"Every day"**
- Set time: **00:00** (midnight)
- Set timezone: **Your timezone** (e.g., America/New_York)

### 4.3 Configure Request Settings

Scroll down to **"Request settings"**:

**Request method:**
- Select: **POST**

**Request headers:**
Click **"Add header"** and enter:
- **Name:** `Authorization`
- **Value:** `Bearer YOUR_CRON_SECRET_HERE`
  
*Replace `YOUR_CRON_SECRET_HERE` with the secret you generated in Step 1*

Example:
```
Authorization: Bearer a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 4.4 Configure Notifications (Optional but Recommended)

Scroll to **"Notifications"**:

**Enable notifications:**
- Check: **"Notify me about execution failures"**
- Email: (your email will be pre-filled)

This way you'll be alerted if the cron job fails.

### 4.5 Save the Job

1. Scroll to bottom
2. Click **"Create cronjob"**
3. You'll see a success message

---

## Step 5: Create Cron Job #2 - Distribute Allowances

Repeat the process for the second cron job:

### 5.1 Create New Job

1. Click **"Create cronjob"** again

### 5.2 Configure

**Title:**
```
Hearth - Distribute Allowances
```

**Address (URL):**
```
https://YOUR-APP-NAME.vercel.app/api/cron/distribute-allowances
```

**Schedule:**
- **Every day**
- Time: **01:00** (1 AM)
- Timezone: **Your timezone**

**Request method:**
- **POST**

**Request headers:**
- Name: `Authorization`
- Value: `Bearer YOUR_CRON_SECRET_HERE`

**Notifications:**
- Check: **"Notify me about execution failures"**

### 5.3 Save

Click **"Create cronjob"**

---

## Step 6: Create Cron Job #3 - Sync External Calendars

Repeat one more time for the calendar sync:

### 6.1 Create New Job

1. Click **"Create cronjob"** again

### 6.2 Configure

**Title:**
```
Hearth - Sync External Calendars
```

**Address (URL):**
```
https://YOUR-APP-NAME.vercel.app/api/cron/sync-external-calendars
```

**Schedule:**
- **Every day**
- Time: **02:00** (2 AM)
- Timezone: **Your timezone**

**Request method:**
- **POST**

**Request headers:**
- Name: `Authorization`
- Value: `Bearer YOUR_CRON_SECRET_HERE`

**Notifications:**
- Check: **"Notify me about execution failures"**

### 6.3 Save

Click **"Create cronjob"**

---

## Step 7: Verify Your Cron Jobs

You should now see 3 cron jobs in your dashboard:

| Job Name | URL | Schedule | Status |
|----------|-----|----------|--------|
| Hearth - Generate Chore Instances | .../generate-chore-instances | Every day at 00:00 | ✓ Enabled |
| Hearth - Distribute Allowances | .../distribute-allowances | Every day at 01:00 | ✓ Enabled |
| Hearth - Sync External Calendars | .../sync-external-calendars | Every day at 02:00 | ✓ Enabled |

Each should show:
- ✅ Green checkmark (enabled)
- Next execution time
- History (will be empty initially)

---

## Step 8: Test Your Cron Jobs Manually

Before waiting for the scheduled time, test each endpoint manually:

### 8.1 Get Your CRON_SECRET

From Vercel dashboard → Settings → Environment Variables, copy your `CRON_SECRET` value.

### 8.2 Test Each Endpoint

Open your terminal and run these commands (replace the values):

```bash
# Set your secret and URL
export CRON_SECRET="your-secret-here"
export APP_URL="https://your-app.vercel.app"

# Test #1: Generate Chore Instances
curl -X POST "$APP_URL/api/cron/generate-chore-instances" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v

# Test #2: Distribute Allowances
curl -X POST "$APP_URL/api/cron/distribute-allowances" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v

# Test #3: Sync External Calendars
curl -X POST "$APP_URL/api/cron/sync-external-calendars" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -v
```

**Expected response for each:**
```json
{"success": true}
```

If you get `{"error": "Unauthorized"}`, double-check:
- Your CRON_SECRET matches in Vercel and cron-job.org
- You redeployed after adding CRON_SECRET to Vercel
- The `Bearer ` prefix is included in the Authorization header

---

## Step 9: Test via cron-job.org Dashboard

You can also manually trigger the jobs from cron-job.org:

1. Go to your cron-job.org dashboard
2. Find one of your jobs
3. Click the **"Execute now"** button (play icon)
4. Wait a few seconds
5. Check the **"History"** tab to see if it succeeded

**Success indicators:**
- Status code: **200 OK**
- Response body: `{"success":true}`
- No error messages

---

## Monitoring & Maintenance

### View Execution History

In cron-job.org dashboard:

1. Click on any cron job
2. Go to **"History"** tab
3. See all executions with:
   - Timestamp
   - Status code
   - Response time
   - Response body

### Email Notifications

If a job fails, you'll receive an email with:
- Which job failed
- Error message
- Response from your server
- Suggested actions

### Viewing Logs in Vercel

To see what happened during cron execution:

1. Go to Vercel dashboard
2. Click **Logs** in the sidebar
3. Filter by time range when cron ran
4. Search for: `/api/cron/` to see cron-related logs

---

## Troubleshooting

### "401 Unauthorized" Error

**Problem:** Cron job returns 401 status
**Solution:**
1. Verify CRON_SECRET is set in Vercel
2. Redeploy your app after adding the secret
3. Check the Authorization header format: `Bearer YOUR_SECRET` (with space after "Bearer")
4. Ensure no extra spaces or quotes in the secret

### "404 Not Found" Error

**Problem:** Cron job returns 404
**Solution:**
1. Verify the URL is correct (check for typos)
2. Make sure your Vercel deployment is live
3. Test the URL in a browser (should return "Unauthorized" if working)

### "500 Internal Server Error"

**Problem:** Cron job returns 500
**Solution:**
1. Check Vercel logs for the error details
2. Verify your database connection (Supabase credentials)
3. Check if all environment variables are set

### Job Shows "Failed" in History

**Solution:**
1. Click on the failed execution to see details
2. Check the error message
3. Look at Vercel logs for the timestamp
4. Fix the issue in your code and redeploy

### Need to Change the Schedule?

1. Click on the cron job in cron-job.org
2. Click **"Edit"**
3. Change the schedule
4. Click **"Save changes"**

---

## Advanced Options

### Want Hourly Calendar Sync Instead of Daily?

Edit the "Sync External Calendars" job:

1. Click on the job → **"Edit"**
2. Schedule → Select **"Every hour"**
3. Or use custom: `0 * * * *` (every hour at minute 0)
4. Save

### Want Different Timezones?

Each job can have its own timezone:

1. Edit the job
2. Change "Timezone" dropdown
3. Save

### Want to Disable a Job Temporarily?

1. Click on the job
2. Click the toggle switch to **disable**
3. The job will be paused (can re-enable anytime)

---

## Cost & Limits

**cron-job.org Free Plan:**
- ✅ Unlimited cron jobs
- ✅ 1-minute minimum interval
- ✅ Email notifications
- ✅ Execution history
- ✅ No credit card required
- ✅ Free forever

**Paid plans available** (if you want):
- More features
- Longer history retention
- Priority support

But the free plan is perfect for this use case!

---

## Security Best Practices

### ✅ DO:
- Use a strong random secret (32+ characters)
- Rotate your CRON_SECRET periodically (every 6 months)
- Keep the secret in environment variables only
- Enable failure notifications

### ❌ DON'T:
- Commit CRON_SECRET to Git
- Share your secret publicly
- Use predictable secrets (like "mysecret123")
- Disable the Authorization check in your code

---

## Backup Configuration

**Save this information** in a secure place:

```
HEARTH CRON CONFIGURATION
========================

CRON_SECRET: [your-secret-here]

Job 1: Generate Chore Instances
  URL: https://your-app.vercel.app/api/cron/generate-chore-instances
  Schedule: Daily at 00:00
  
Job 2: Distribute Allowances
  URL: https://your-app.vercel.app/api/cron/distribute-allowances
  Schedule: Daily at 01:00
  
Job 3: Sync External Calendars
  URL: https://your-app.vercel.app/api/cron/sync-external-calendars
  Schedule: Daily at 02:00

cron-job.org account: [your-email]
```

---

## Summary Checklist

- [ ] Generate CRON_SECRET with `openssl rand -hex 32`
- [ ] Add CRON_SECRET to Vercel environment variables
- [ ] Redeploy Vercel app
- [ ] Sign up for cron-job.org
- [ ] Create "Generate Chore Instances" job (00:00 daily)
- [ ] Create "Distribute Allowances" job (01:00 daily)
- [ ] Create "Sync External Calendars" job (02:00 daily)
- [ ] Test all endpoints with curl
- [ ] Verify jobs execute successfully in cron-job.org history
- [ ] Enable email notifications for failures
- [ ] Save configuration for backup

---

**That's it!** Your cron jobs are now set up and will run automatically every day. 🎉

If you have any issues, check the Troubleshooting section or review the execution history in cron-job.org.

---

**Last Updated:** January 15, 2026  
**Service:** cron-job.org (Free)  
**Setup Time:** ~10-15 minutes
