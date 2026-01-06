# HTTPS Quick Start Guide

This is a condensed guide for quickly setting up HTTPS. For detailed instructions, see `PORTAINER_HTTPS_SETUP.md`.

## Prerequisites

✅ DNS A record: `hearth.blanchardsd.com` → `100.75.223.100`  
✅ Ports 80 and 443 open in firewall  
✅ Portainer installed

## Quick Setup (5 Steps)

### 1. Generate Self-Signed Certificate (Optional but Recommended)

```bash
cd /path/to/HouseholdERP
./scripts/generate-self-signed-cert.sh
```

This allows Nginx to start immediately with HTTPS (browser will show warning until Let's Encrypt cert is ready).

### 2. Create Network in Portainer

1. Portainer → **Networks** → **Add network**
2. Name: `hearth-network`, Driver: `bridge`
3. Click **Create**

### 3. Deploy Nginx Stack

1. Portainer → **Stacks** → **Add stack**
2. Name: `nginx-reverse-proxy`
3. Paste contents of `docker-compose.nginx.yml`
4. **IMPORTANT:** Update email in the file:
   ```yaml
   EMAIL="your-email@blanchardsd.com"
   ```
5. For volumes, use bind mounts pointing to your repo:
   ```yaml
   volumes:
     - /path/to/repo/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
     - /path/to/repo/nginx/conf.d:/etc/nginx/conf.d:ro
     - /path/to/repo/nginx/certs:/etc/nginx/certs:rw
     - /path/to/repo/nginx/logs:/var/log/nginx
   ```
6. Click **Deploy the stack**

### 4. Update Hearth Stack

1. Portainer → **Stacks** → Your Hearth stack → **Editor**
2. Remove/comment port mapping:
   ```yaml
   # ports:
   #   - "3000:3000"
   ```
3. Ensure network:
   ```yaml
   networks:
     - hearth-network
   ```
4. Update environment:
   ```yaml
   environment:
     - NEXTAUTH_URL=https://hearth.blanchardsd.com
   ```
5. **Update the stack**

### 5. Get Let's Encrypt Certificate

1. Wait 1-2 minutes for containers to start
2. Check Certbot logs:
   - Portainer → Stacks → `nginx-reverse-proxy` → `certbot` → **Logs**
3. If certificate generated successfully, reload Nginx:
   ```bash
   docker exec nginx-reverse-proxy nginx -s reload
   ```
4. Test: `https://hearth.blanchardsd.com`

## Troubleshooting

**502 Bad Gateway?**
- Check Hearth app is running
- Verify both on `hearth-network`
- Check container name is `hearth-app`

**Certificate not generated?**
- Check DNS: `nslookup hearth.blanchardsd.com`
- Verify port 80 is accessible
- Check Certbot logs for errors

**Mixed content warnings?**
- Ensure `NEXTAUTH_URL=https://hearth.blanchardsd.com`
- Clear browser cache

## That's It!

Your site should now be accessible at `https://hearth.blanchardsd.com` with a valid SSL certificate that auto-renews.
