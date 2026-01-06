# HTTPS Setup Guide for Portainer

This guide walks you through setting up HTTPS for Hearth using Nginx as a reverse proxy with Let's Encrypt SSL certificates, all managed through Portainer.

## Prerequisites

- Domain name: `hearth.blanchardsd.com`
- Server IP: `100.75.223.100`
- Portainer installed and running
- Docker and Docker Compose installed
- Ports 80 and 443 open in firewall
- DNS A record pointing `hearth.blanchardsd.com` to `100.75.223.100`

## Step 1: DNS Configuration

Before starting, ensure your DNS is configured:

1. Log into your DNS provider (where `blanchardsd.com` is managed)
2. Add an A record:
   - **Name:** `hearth` (or `hearth.blanchardsd.com` depending on provider)
   - **Type:** A
   - **Value:** `100.75.223.100`
   - **TTL:** 300 (or default)

3. Verify DNS propagation:
   ```bash
   dig hearth.blanchardsd.com
   # or
   nslookup hearth.blanchardsd.com
   ```
   Should return `100.75.223.100`

## Step 2: Firewall Configuration

Ensure ports are open:

```bash
# If using UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# If using firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# If using iptables directly
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## Step 3: Create Nginx Reverse Proxy Stack in Portainer

### 3.1 Create Network (if not exists)

1. In Portainer, go to **Networks**
2. Click **Add network**
3. Name: `hearth-network`
4. Driver: `bridge`
5. Click **Create the network**

### 3.2 Create Nginx Reverse Proxy Stack

1. In Portainer, go to **Stacks**
2. Click **Add stack**
3. Name: `nginx-reverse-proxy`
4. Copy the contents of `docker-compose.nginx.yml` (see below)
5. Click **Deploy the stack**

## Step 4: Update Hearth Production Stack

1. In Portainer, go to your Hearth stack
2. Edit the stack configuration
3. Ensure:
   - The app is on the `hearth-network` network
   - The app container name is `hearth-app` (or update nginx config accordingly)
   - Port mapping is removed (we'll access via nginx)
   - `NEXTAUTH_URL` is set to `https://hearth.blanchardsd.com`

Example environment variables:
```env
NEXTAUTH_URL=https://hearth.blanchardsd.com
NEXTAUTH_SECRET=your-secret-here-min-32-chars
DATABASE_URL=postgresql://user:pass@hearth-db:5432/hearth_db
```

## Step 5: SSL Certificate Generation

The Nginx container will automatically obtain SSL certificates from Let's Encrypt on first run.

1. Check Nginx logs:
   ```bash
   docker logs nginx-reverse-proxy
   ```

2. Look for certificate generation messages:
   ```
   Creating/renewal hearth.blanchardsd.com certificates... (hearth.blanchardsd.com)
   ```

3. If successful, certificates will be in:
   - `/docker/nginx/certs/hearth.blanchardsd.com.crt`
   - `/docker/nginx/certs/hearth.blanchardsd.com.key`

## Step 6: Verify HTTPS

1. Open browser: `https://hearth.blanchardsd.com`
2. You should see a valid SSL certificate
3. The site should load correctly

## Troubleshooting

### Certificate Generation Fails

**Problem:** Let's Encrypt can't verify domain ownership

**Solutions:**
- Verify DNS A record is correct and propagated
- Ensure port 80 is accessible from internet
- Check firewall rules
- Review Nginx logs: `docker logs nginx-reverse-proxy`

### 502 Bad Gateway

**Problem:** Nginx can't reach the Hearth app

**Solutions:**
- Verify both containers are on `hearth-network`
- Check Hearth app container name matches nginx config
- Verify Hearth app is running: `docker ps`
- Check Hearth app logs: `docker logs hearth-app`

### Mixed Content Warnings

**Problem:** Some resources load over HTTP

**Solutions:**
- Ensure `NEXTAUTH_URL` is set to `https://hearth.blanchardsd.com`
- Check Next.js config for proper HTTPS handling
- Clear browser cache

### Certificate Renewal

Certificates auto-renew via cron job in the Nginx container. To manually renew:

```bash
docker exec nginx-reverse-proxy certbot renew
docker exec nginx-reverse-proxy nginx -s reload
```

## Maintenance

### View Nginx Logs
```bash
docker logs nginx-reverse-proxy
docker logs nginx-reverse-proxy --tail 100 -f
```

### Reload Nginx Configuration
```bash
docker exec nginx-reverse-proxy nginx -s reload
```

### Check Certificate Expiry
```bash
docker exec nginx-reverse-proxy certbot certificates
```

## Security Best Practices

1. **Keep certificates updated:** Auto-renewal is enabled
2. **Use strong secrets:** Ensure `NEXTAUTH_SECRET` is at least 32 characters
3. **Regular updates:** Keep Nginx and Certbot images updated
4. **Monitor logs:** Regularly check for suspicious activity
5. **Firewall:** Only expose ports 80 and 443 to the internet

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Let's Encrypt](https://letsencrypt.org/)
