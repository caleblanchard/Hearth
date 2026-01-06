# HTTPS Setup with Synology NAS Reverse Proxy

This guide walks you through setting up HTTPS for Hearth using Synology NAS's built-in reverse proxy feature, which eliminates the need for a separate Nginx container.

## Overview

Synology DSM includes a Reverse Proxy feature that can:
- Handle SSL/TLS termination
- Automatically obtain and renew Let's Encrypt certificates
- Route traffic to your Docker containers
- Provide built-in security features

## Prerequisites

- Synology NAS with DSM 6.0+ (DSM 7.0+ recommended)
- Domain name: `hearth.blanchardsd.com`
- DNS A record pointing to your Synology NAS IP: `100.75.223.100`
- Portainer or Docker running on Synology
- Hearth container running and accessible internally

## Step 1: Install and Configure Synology Reverse Proxy

### 1.1 Install Reverse Proxy Package

1. Open **DSM** (DiskStation Manager)
2. Go to **Package Center**
3. Search for **"Reverse Proxy"** or **"Web Station"**
4. Install if not already installed (usually comes with DSM)

### 1.2 Access Reverse Proxy Settings

1. Open **Control Panel**
2. Navigate to **Login Portal** → **Advanced** → **Reverse Proxy**
   - OR go to **Application Portal** → **Reverse Proxy** (DSM 7.0+)
3. Click **Create** or **Add**

### 1.3 Configure Reverse Proxy Rule

Fill in the following:

**Description:**
```
Hearth HTTPS
```

**Source:**
- **Protocol:** HTTPS
- **Hostname:** `hearth.blanchardsd.com`
- **Port:** `443`

**Destination:**
- **Protocol:** HTTP
- **Hostname:** `localhost` (or your Synology's internal IP)
- **Port:** `3000` (or the port your Hearth container uses)

**Advanced Settings:**
- ✅ **Enable HSTS** (recommended)
- ✅ **Enable HTTP/2** (recommended)
- ✅ **Enable WebSocket** (required for Next.js hot reload in dev)

Click **Save**

## Step 2: Configure SSL Certificate

### 2.1 Access Certificate Settings

1. In **Control Panel**, go to **Security** → **Certificate**
2. Click **Add** → **Add a new certificate**

### 2.2 Request Let's Encrypt Certificate

1. Select **Get a certificate from Let's Encrypt**
2. Fill in:
   - **Domain name:** `hearth.blanchardsd.com`
   - **Email:** `caleb@blanchardsd.com` (or your email)
   - **Subject alternative name:** Leave empty (or add `www.hearth.blanchardsd.com` if needed)
3. Click **Apply**

**Important:** 
- Port 80 must be accessible from the internet for Let's Encrypt validation
- DNS must be correctly configured before requesting certificate
- Synology will automatically renew the certificate

### 2.3 Assign Certificate to Reverse Proxy

1. Go back to **Reverse Proxy** settings
2. Edit your Hearth rule
3. Under **SSL Certificate**, select the certificate you just created
4. Click **Save**

## Step 3: Configure Firewall

### 3.1 Open Required Ports

1. Go to **Control Panel** → **Security** → **Firewall**
2. Click **Edit Rules**
3. Ensure these ports are open:
   - **Port 80** (HTTP - for Let's Encrypt validation)
   - **Port 443** (HTTPS - for your application)
4. Click **Save**

### 3.2 Configure Router (if needed)

If your Synology is behind a router, configure port forwarding:
- **External Port 80** → **Synology IP:80**
- **External Port 443** → **Synology IP:443**

## Step 4: Update Hearth Container Configuration

### 4.1 Update Environment Variables

In Portainer or Docker, update your Hearth stack:

```yaml
environment:
  - NEXTAUTH_URL=https://hearth.blanchardsd.com
  - NEXTAUTH_SECRET=your-secret-min-32-chars
  - AUTH_TRUST_HOST=true
  # ... other environment variables
```

### 4.2 Container Port Mapping

Your Hearth container should expose port 3000 internally (not to the host):

```yaml
ports:
  - "3000:3000"  # Internal only - Synology reverse proxy will access this
```

Or if you want to be more explicit:

```yaml
ports:
  - "127.0.0.1:3000:3000"  # Only accessible from localhost
```

### 4.3 Network Configuration

Ensure your Hearth container is on a Docker network that Synology can access. If using Portainer:

```yaml
networks:
  - hearth-network
```

## Step 5: Verify Configuration

### 5.1 Test Internal Access

First, verify Hearth is accessible internally:

```bash
# From Synology terminal or SSH
curl http://localhost:3000/api/health
```

Should return a successful response.

### 5.2 Test HTTPS Access

1. Open browser
2. Navigate to: `https://hearth.blanchardsd.com`
3. You should see:
   - Valid SSL certificate (green lock)
   - Hearth application loads correctly

### 5.3 Test HTTP Redirect (Optional)

If you want HTTP to redirect to HTTPS:

1. In **Reverse Proxy**, create another rule:
   - **Source:** HTTP, Port 80, Hostname: `hearth.blanchardsd.com`
   - **Destination:** HTTPS, Port 443, Hostname: `hearth.blanchardsd.com`
   - **Enable:** Redirect

## Step 6: Configure Additional Settings

### 6.1 Custom Headers (Optional)

In Reverse Proxy advanced settings, you can add custom headers:

```
X-Forwarded-Proto: https
X-Forwarded-Host: hearth.blanchardsd.com
X-Real-IP: $remote_addr
```

### 6.2 WebSocket Support

For Next.js development or real-time features:
- Enable **WebSocket** in Reverse Proxy advanced settings
- This is usually enabled by default

## Troubleshooting

### Certificate Not Issued

**Problem:** Let's Encrypt certificate request fails

**Solutions:**
- Verify DNS A record: `nslookup hearth.blanchardsd.com`
- Ensure port 80 is accessible from internet
- Check firewall rules
- Wait a few minutes and try again (rate limiting)

### 502 Bad Gateway

**Problem:** Reverse proxy can't reach Hearth container

**Solutions:**
- Verify Hearth container is running: `docker ps`
- Check container port is 3000
- Test internal access: `curl http://localhost:3000/api/health`
- Verify reverse proxy destination port matches container port

### Mixed Content Warnings

**Problem:** Browser shows mixed content warnings

**Solutions:**
- Ensure `NEXTAUTH_URL=https://hearth.blanchardsd.com` (not http)
- Clear browser cache
- Check Next.js configuration

### Certificate Not Auto-Renewing

**Problem:** Certificate expires

**Solutions:**
- Check certificate expiration in **Control Panel** → **Security** → **Certificate**
- Synology should auto-renew, but verify:
  - Certificate is assigned to reverse proxy
  - Port 80 is accessible
  - DNS is still correct

## Advantages of Synology Reverse Proxy

✅ **No additional containers** - Uses built-in DSM features  
✅ **Automatic certificate renewal** - Handled by Synology  
✅ **Easy management** - GUI-based configuration  
✅ **Integrated with DSM** - Works with other Synology services  
✅ **Less resource usage** - No separate Nginx container  

## Maintenance

### View Logs

- **Reverse Proxy logs:** Control Panel → Log Center → Logs
- **Hearth container logs:** Portainer → Container → Logs

### Renew Certificate Manually

1. Control Panel → Security → Certificate
2. Select your certificate
3. Click **Renew**

### Update Reverse Proxy Rule

1. Control Panel → Reverse Proxy
2. Select your rule
3. Click **Edit**
4. Make changes and **Save**

## Security Best Practices

1. ✅ **Enable HSTS** in reverse proxy settings
2. ✅ **Use strong NEXTAUTH_SECRET** (32+ characters)
3. ✅ **Keep DSM updated** for security patches
4. ✅ **Regular backups** of your configuration
5. ✅ **Monitor certificate expiration** (auto-renewal should handle this)
6. ✅ **Firewall rules** - Only expose necessary ports

## Next Steps

- Set up monitoring/alerting for certificate expiration
- Configure backup of SSL certificates
- Consider setting up HTTP to HTTPS redirect
- Review and adjust security headers as needed
