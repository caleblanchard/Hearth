# Portainer HTTPS Setup - Step-by-Step Guide

This is a detailed step-by-step guide for setting up HTTPS in Portainer for Hearth.

## Overview

We'll set up:
1. Nginx reverse proxy (handles HTTPS termination)
2. Certbot (automatically obtains and renews SSL certificates)
3. Update Hearth stack to work behind the proxy

## Prerequisites Checklist

- [ ] Domain `hearth.blanchardsd.com` DNS A record points to `100.75.223.100`
- [ ] Ports 80 and 443 are open in firewall
- [ ] Portainer is installed and accessible
- [ ] Hearth production stack is running (or ready to deploy)

## Step 1: Verify DNS

1. Open terminal/command prompt
2. Run:
   ```bash
   nslookup hearth.blanchardsd.com
   ```
3. Should return: `100.75.223.100`
4. If not, wait a few minutes for DNS propagation

## Step 2: Create Network in Portainer

1. Log into Portainer
2. Click **Networks** in the left sidebar
3. Click **Add network**
4. Fill in:
   - **Name:** `hearth-network`
   - **Driver:** `bridge`
   - **Scope:** `local`
5. Click **Create the network**

## Step 3: Deploy Nginx Reverse Proxy Stack

### 3.1 Prepare Files

1. In Portainer, go to **Stacks**
2. Click **Add stack**
3. Name: `nginx-reverse-proxy`

### 3.2 Add Docker Compose

1. In the **Web editor** tab, paste the contents of `docker-compose.nginx.yml`
2. **Important:** Update the email address in the Certbot section:
   ```yaml
   --email your-email@blanchardsd.com \
   ```
   Replace `your-email@blanchardsd.com` with your actual email

### 3.3 Configure Volumes

Before deploying, you need to create the volume bind mounts. In Portainer:

1. Click **Volumes** in the left sidebar
2. For each volume, click **Add volume**:
   - `nginx-config` (or use bind mount to `./nginx`)
   - `nginx-certs` (or use bind mount to `./nginx/certs`)
   - `nginx-logs` (or use bind mount to `./nginx/logs`)

**OR** use bind mounts (recommended for easier access):

In the stack editor, update volumes to use bind mounts:
```yaml
volumes:
  - /path/to/your/repo/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  - /path/to/your/repo/nginx/conf.d:/etc/nginx/conf.d:ro
  - /path/to/your/repo/nginx/certs:/etc/nginx/certs:ro
  - /path/to/your/repo/nginx/logs:/var/log/nginx
```

### 3.4 Deploy

1. Click **Deploy the stack**
2. Wait for containers to start
3. Check logs: Click on the stack → Click on `nginx-reverse-proxy` container → **Logs**

## Step 4: Update Hearth Stack

### 4.1 Edit Hearth Stack

1. In Portainer, go to **Stacks**
2. Find your Hearth stack (or create it from `docker-compose.prod.yml`)
3. Click **Editor** (or **Duplicate/Edit**)

### 4.2 Update Configuration

1. **Remove port mapping** (or comment it out):
   ```yaml
   # ports:
   #   - "${APP_PORT:-3000}:3000"
   ```

2. **Ensure network is set**:
   ```yaml
   networks:
     - hearth-network
   ```

3. **Update environment variables**:
   ```yaml
   environment:
     - NEXTAUTH_URL=https://hearth.blanchardsd.com
     - NEXTAUTH_SECRET=your-secret-min-32-chars
     - AUTH_TRUST_HOST=true
   ```

4. **Save and redeploy** the stack

## Step 5: Verify SSL Certificate Generation

1. Wait 1-2 minutes after deploying
2. Check Certbot logs:
   - Go to **Stacks** → `nginx-reverse-proxy`
   - Click on `certbot` container
   - View **Logs**
   - Look for: `Successfully received certificate`

3. Check Nginx logs:
   - Click on `nginx-reverse-proxy` container
   - View **Logs**
   - Should see: `SSL certificate configured`

## Step 6: Test HTTPS

1. Open browser
2. Navigate to: `https://hearth.blanchardsd.com`
3. You should see:
   - Valid SSL certificate (green lock icon)
   - Hearth application loads correctly

## Step 7: Verify Everything Works

### Test HTTP Redirect
1. Navigate to: `http://hearth.blanchardsd.com`
2. Should automatically redirect to HTTPS

### Test API Endpoints
1. Try logging in
2. Test various features
3. Check browser console for any mixed content warnings

## Troubleshooting

### Certificate Not Generated

**Symptoms:** Browser shows "Not Secure" or certificate error

**Check:**
1. DNS is correct: `nslookup hearth.blanchardsd.com`
2. Port 80 is accessible from internet
3. Certbot logs for errors
4. Firewall allows port 80

**Solution:**
```bash
# Check Certbot logs in Portainer
# Look for specific error messages
# Common issues:
# - DNS not propagated (wait longer)
# - Port 80 blocked (check firewall)
# - Rate limit hit (wait 1 hour)
```

### 502 Bad Gateway

**Symptoms:** Site shows "502 Bad Gateway"

**Check:**
1. Hearth app container is running
2. Both containers are on `hearth-network`
3. Container name matches nginx config (`hearth-app`)

**Solution:**
1. In Portainer, verify:
   - Hearth stack is running
   - Container name is `hearth-app`
   - Network is `hearth-network`
2. Check Nginx logs for connection errors
3. Test from nginx container:
   ```bash
   docker exec nginx-reverse-proxy wget -O- http://hearth-app:3000/api/health
   ```

### Mixed Content Warnings

**Symptoms:** Browser console shows mixed content warnings

**Solution:**
1. Ensure `NEXTAUTH_URL=https://hearth.blanchardsd.com` (not http)
2. Clear browser cache
3. Check Next.js config for proper HTTPS handling

### Can't Access Site

**Check:**
1. Firewall rules (ports 80, 443)
2. DNS propagation: `nslookup hearth.blanchardsd.com`
3. Container status in Portainer
4. Nginx logs for errors

## Maintenance

### View Logs
- **Nginx:** Portainer → Stacks → `nginx-reverse-proxy` → `nginx-reverse-proxy` → Logs
- **Certbot:** Portainer → Stacks → `nginx-reverse-proxy` → `certbot` → Logs
- **Hearth:** Portainer → Stacks → Your Hearth stack → Container → Logs

### Renew Certificates Manually
Certificates auto-renew, but to manually renew:
1. In Portainer, go to `nginx-reverse-proxy` stack
2. Click on `certbot` container
3. Click **Console**
4. Run:
   ```bash
   certbot renew
   cp /etc/letsencrypt/live/hearth.blanchardsd.com/fullchain.pem /etc/nginx/certs/hearth.blanchardsd.com.crt
   cp /etc/letsencrypt/live/hearth.blanchardsd.com/privkey.pem /etc/nginx/certs/hearth.blanchardsd.com.key
   ```
5. Reload Nginx:
   ```bash
   nginx -s reload
   ```

### Update Nginx Configuration
1. Edit files in `nginx/` directory
2. In Portainer, go to `nginx-reverse-proxy` stack
3. Click **Editor**
4. Make changes
5. Click **Update the stack**
6. Or reload Nginx:
   ```bash
   docker exec nginx-reverse-proxy nginx -s reload
   ```

## Security Checklist

- [ ] SSL certificates are valid and auto-renewing
- [ ] HTTP redirects to HTTPS
- [ ] Security headers are set
- [ ] Rate limiting is configured
- [ ] Firewall only allows ports 80, 443
- [ ] Strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Regular updates of Nginx and Certbot images

## Next Steps

- Set up monitoring/alerting for certificate expiration
- Configure backup of SSL certificates
- Set up log rotation for Nginx logs
- Consider adding fail2ban for additional security
