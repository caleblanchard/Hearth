# PWA Installation Troubleshooting

## Issue: PWA Install Prompt Not Showing in Production

If the PWA install prompt works in local development but not in production containers, check the following:

### 1. HTTPS Requirement (CRITICAL)

**PWAs require HTTPS in production.** The `beforeinstallprompt` event will NOT fire if:
- The site is not served over HTTPS (except localhost)
- The SSL certificate is invalid or self-signed
- The site is served over HTTP in production

**Solution:**
- Ensure your production deployment uses HTTPS
- Use a reverse proxy (nginx, Traefik, etc.) with SSL termination
- Or use a service like Vercel, Netlify, or Cloudflare that provides HTTPS automatically

### 2. Service Worker Registration

The service worker must be successfully registered for the install prompt to appear.

**Check:**
1. Open browser DevTools → Application → Service Workers
2. Verify the service worker is registered and active
3. Check the console for any registration errors

**Common Issues:**
- Service worker file not accessible at `/sw.js`
- Service worker registration failing silently
- CORS issues preventing service worker registration

**Solution:**
- Verify `/sw.js` is accessible in production (should return 200 OK)
- Check browser console for registration errors
- Ensure service worker is served with correct MIME type (`application/javascript`)

### 3. Manifest.json Accessibility

The manifest must be accessible and valid.

**Check:**
1. Open browser DevTools → Application → Manifest
2. Verify manifest is loaded and valid
3. Check that `/manifest.json` returns 200 OK with correct content-type

**Common Issues:**
- Manifest not accessible in standalone mode
- Invalid JSON in manifest
- Missing required fields (icons, start_url, etc.)

**Solution:**
- Verify `/manifest.json` is accessible in production
- Ensure manifest is served with correct MIME type (`application/manifest+json`)
- Validate manifest using Chrome DevTools or online validators

### 4. Standalone Mode Static Files

In Next.js standalone mode, ensure static files are properly copied.

**Check Dockerfile:**
```dockerfile
# Public directory must be copied
COPY --from=builder /app/public ./public
```

**Verify in container:**
```bash
docker exec hearth-app ls -la /app/public
docker exec hearth-app cat /app/public/manifest.json
docker exec hearth-app cat /app/public/sw.js
```

### 5. Browser Console Debugging

The updated `PWAInstallPrompt` component now logs detailed debugging information:

**Check browser console for:**
- `[PWA]` prefixed messages
- Service worker registration status
- `beforeinstallprompt` event firing
- Any warnings about secure context, service worker, or manifest

### 6. Testing Checklist

Before deploying, verify:

- [ ] Site is served over HTTPS (not HTTP)
- [ ] `/sw.js` is accessible and returns 200 OK
- [ ] `/manifest.json` is accessible and returns 200 OK
- [ ] Service worker is registered (DevTools → Application → Service Workers)
- [ ] Manifest is valid (DevTools → Application → Manifest)
- [ ] Icons are accessible (`/icon-192x192.png`, `/icon-512x512.png`)
- [ ] Browser console shows no errors
- [ ] `beforeinstallprompt` event fires (check console logs)

### 7. Common Production Issues

#### Issue: Service Worker Not Found (404)
**Cause:** Service worker file not copied to production or wrong path
**Fix:** Verify Dockerfile copies public directory and service worker is generated

#### Issue: Manifest Not Found (404)
**Cause:** Manifest not accessible in standalone mode
**Fix:** Ensure public directory is copied and Next.js serves it correctly

#### Issue: beforeinstallprompt Never Fires
**Cause:** Usually HTTPS issue or service worker not registered
**Fix:** 
1. Verify HTTPS is configured
2. Check service worker registration
3. Verify manifest is accessible

#### Issue: Install Prompt Shows But Install Fails
**Cause:** Service worker or manifest issues
**Fix:** Check browser console for specific errors

### 8. Quick Debug Commands

```bash
# Check if service worker is accessible
curl -I https://your-domain.com/sw.js

# Check if manifest is accessible
curl -I https://your-domain.com/manifest.json

# Check service worker registration in browser
# DevTools → Application → Service Workers

# Check manifest in browser
# DevTools → Application → Manifest
```

### 9. Next Steps

If the install prompt still doesn't appear after checking all above:

1. **Verify HTTPS:** This is the #1 cause of PWA issues in production
2. **Check Browser Console:** Look for `[PWA]` prefixed debug messages
3. **Verify Service Worker:** Check DevTools → Application → Service Workers
4. **Verify Manifest:** Check DevTools → Application → Manifest
5. **Test in Different Browsers:** Chrome, Edge, and Safari have different PWA support

### 10. Additional Resources

- [PWA Installation Requirements](https://web.dev/install-criteria/)
- [Service Worker Registration](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
