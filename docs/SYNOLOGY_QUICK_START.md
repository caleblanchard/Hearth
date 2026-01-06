# Synology HTTPS Quick Start

Quick setup guide for using Synology's built-in reverse proxy with Hearth.

## Prerequisites Checklist

- [ ] DNS: `hearth.blanchardsd.com` → `100.75.223.100`
- [ ] Hearth container running on port 3000
- [ ] Ports 80 and 443 open in Synology firewall

## Quick Setup (4 Steps)

### 1. Create Reverse Proxy Rule

1. **DSM** → **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. Click **Create**
3. Configure:
   - **Source:** HTTPS, `hearth.blanchardsd.com`, Port `443`
   - **Destination:** HTTP, `localhost`, Port `3000`
   - ✅ Enable HSTS
   - ✅ Enable WebSocket
4. Click **Save**

### 2. Get SSL Certificate

1. **Control Panel** → **Security** → **Certificate**
2. Click **Add** → **Get a certificate from Let's Encrypt**
3. Fill in:
   - **Domain:** `hearth.blanchardsd.com`
   - **Email:** `caleb@blanchardsd.com`
4. Click **Apply**

### 3. Assign Certificate

1. Go back to **Reverse Proxy** settings
2. Edit your Hearth rule
3. Under **SSL Certificate**, select the Let's Encrypt certificate
4. Click **Save**

### 4. Update Hearth Environment

In Portainer/Docker, set:
```env
NEXTAUTH_URL=https://hearth.blanchardsd.com
AUTH_TRUST_HOST=true
```

## Test

Open: `https://hearth.blanchardsd.com`

## Troubleshooting

**502 Bad Gateway?**
- Check Hearth container is running
- Verify port 3000 is correct
- Test: `curl http://localhost:3000/api/health`

**Certificate failed?**
- Check DNS is correct
- Verify port 80 is accessible
- Wait a few minutes and retry

**Mixed content?**
- Ensure `NEXTAUTH_URL` uses `https://`
- Clear browser cache

## That's It!

Your site is now accessible at `https://hearth.blanchardsd.com` with automatic certificate renewal handled by Synology.
