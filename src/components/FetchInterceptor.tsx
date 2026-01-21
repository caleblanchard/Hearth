'use client';

import { useEffect } from 'react';

/**
 * Component that installs the global fetch interceptor
 * Must be a client component to access window.fetch
 */
export default function FetchInterceptor() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    let isInstalled = false;
    
    // Check if already installed
    if ((window.fetch as any)._hearthInterceptor) {
      console.log('🔗 Fetch interceptor already installed');
      return;
    }
    
    window.fetch = function(...args) {
      const [url, options = {}] = args;
      
      // Only add header to API routes
      if (typeof url === 'string' && url.startsWith('/api/')) {
        const headers = new Headers(options.headers);

        // Active family ID
        const allKeys = Object.keys(localStorage);
        const familyKey = allKeys.find(key => key.startsWith('hearth_active_family_id_'));
        const familyId = familyKey ? localStorage.getItem(familyKey) : null;
        if (familyId) {
          headers.set('x-active-family-id', familyId);
          if (!isInstalled) {
            console.log(`🔗 Fetch interceptor: Adding family ID ${familyId.substring(0, 8)}... to ${url}`);
          }
        } else if (!isInstalled) {
          console.warn(`⚠️ Fetch interceptor: No active family ID found for ${url}`);
        }

        // Kiosk headers
        const deviceSecret = localStorage.getItem('kioskDeviceSecret');
        const childToken = localStorage.getItem('kioskChildToken');
        if (childToken) headers.set('X-Kiosk-Child', childToken);
        else if (deviceSecret) headers.set('X-Kiosk-Device', deviceSecret);

        return originalFetch(url, {
          ...options,
          headers,
        });
      }
      
      // For non-API routes or if no family ID, use original fetch
      return originalFetch(...args);
    };
    
    // Mark as installed
    (window.fetch as any)._hearthInterceptor = true;
    isInstalled = true;
    
    console.log('✅ Fetch interceptor installed - all /api/* requests will include active family ID');
    
    // Cleanup on unmount
    return () => {
      window.fetch = originalFetch;
      console.log('🔌 Fetch interceptor uninstalled');
    };
  }, []);
  
  return null; // This component doesn't render anything
}
