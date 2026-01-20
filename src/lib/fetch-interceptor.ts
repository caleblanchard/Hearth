/**
 * Global fetch interceptor for multi-family support
 * Automatically adds x-active-family-id header to all API requests
 * 
 * This runs on the client and intercepts all fetch calls to add
 * the active family ID from localStorage.
 */

if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    
    // Only add header to API routes
    if (typeof url === 'string' && url.startsWith('/api/')) {
      // Get active family ID from localStorage
      const allKeys = Object.keys(localStorage);
      const familyKey = allKeys.find(key => key.startsWith('hearth_active_family_id_'));
      
      if (familyKey) {
        const familyId = localStorage.getItem(familyKey);
        
        if (familyId) {
          // Add header to request
          const headers = new Headers(options.headers);
          headers.set('x-active-family-id', familyId);
          
          // Log for debugging
          console.log(`🔗 Fetch interceptor: Adding family ID ${familyId.substring(0, 8)}... to ${url}`);
          
          return originalFetch(url, {
            ...options,
            headers,
          });
        }
      }
      
      // No family ID found - log warning
      console.warn(`⚠️ Fetch interceptor: No active family ID found for ${url}`);
    }
    
    // For non-API routes or if no family ID, use original fetch
    return originalFetch(...args);
  };
  
  console.log('✅ Fetch interceptor installed - all /api/* requests will include active family ID');
}

export {};
