# Hearth on Synology NAS

This document provides specific guidance for running Hearth on a Synology NAS using the built-in reverse proxy for HTTPS.

## Why Use Synology Reverse Proxy?

✅ **No additional containers needed** - Uses DSM's built-in features  
✅ **Automatic SSL certificate management** - Let's Encrypt integration  
✅ **Easy GUI configuration** - No command line required  
✅ **Lower resource usage** - No separate Nginx container  
✅ **Integrated with DSM** - Works seamlessly with Synology services  

## Quick Start

1. **Deploy Hearth Stack**
   - Use `docker-compose.synology.yml` in Portainer
   - Or use `docker-compose.prod.yml` (same configuration)

2. **Configure Synology Reverse Proxy**
   - See `docs/SYNOLOGY_QUICK_START.md` for step-by-step instructions

3. **Get SSL Certificate**
   - Synology can automatically obtain Let's Encrypt certificates
   - See `docs/SYNOLOGY_HTTPS_SETUP.md` for detailed guide

## Key Configuration Points

### Environment Variables

Ensure these are set in your Hearth container:

```env
NEXTAUTH_URL=https://hearth.blanchardsd.com
AUTH_TRUST_HOST=true
NEXTAUTH_SECRET=your-secret-min-32-chars
```

### Port Configuration

- Hearth container exposes port **3000** internally
- Synology reverse proxy forwards HTTPS (443) → HTTP (3000)
- No need to expose port 3000 externally

### Network

- All containers should be on the same Docker network
- Synology reverse proxy accesses containers via `localhost:3000`

## Documentation

- **Quick Start:** `docs/SYNOLOGY_QUICK_START.md`
- **Detailed Setup:** `docs/SYNOLOGY_HTTPS_SETUP.md`
- **General HTTPS Guide:** `docs/HTTPS_SETUP.md` (for reference)

## Differences from Nginx Setup

| Feature | Nginx Setup | Synology Setup |
|---------|-----------|----------------|
| Reverse Proxy | Separate container | Built-in DSM feature |
| SSL Certificates | Certbot container | DSM Certificate Manager |
| Configuration | Docker Compose + Config files | DSM GUI |
| Resource Usage | Additional container | No extra overhead |
| Certificate Renewal | Cron job in container | Automatic by DSM |

## Troubleshooting

See `docs/SYNOLOGY_HTTPS_SETUP.md` for detailed troubleshooting steps.

Common issues:
- **502 Bad Gateway:** Check container port and reverse proxy destination
- **Certificate errors:** Verify DNS and port 80 accessibility
- **Mixed content:** Ensure `NEXTAUTH_URL` uses `https://`

## Support

For Synology-specific issues:
1. Check Synology DSM logs: **Control Panel** → **Log Center**
2. Verify reverse proxy configuration
3. Check certificate status in **Control Panel** → **Security** → **Certificate**
