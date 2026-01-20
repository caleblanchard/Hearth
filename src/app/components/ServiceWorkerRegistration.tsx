'use client';

import { useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/Modal';

export default function ServiceWorkerRegistration() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Skip in development (next-pwa disables it anyway)
    if (process.env.NODE_ENV === 'development') {
      console.log('[SW] Service Worker disabled in development mode');
      return;
    }

    // Wait for page load to register service worker
    const registerSW = async () => {
      try {
        // next-pwa generates the service worker at /sw.js
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Service Worker registered successfully:', registration.scope);

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
                ) {
                // New service worker available
                console.log('[SW] New service worker available');

                // Optionally notify the user
                setShowUpdatePrompt(true);
              }
            });
          }
        });
      } catch (error) {
        console.error('[SW] Service Worker registration failed:', error);
        // Log additional debugging info
        console.error('[SW] Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    };

    // Register after page load
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }, []);

  return (
    <ConfirmModal
      isOpen={showUpdatePrompt}
      onClose={() => setShowUpdatePrompt(false)}
      onConfirm={() => window.location.reload()}
      title="Update Available"
      message="A new version of Hearth is available. Reload to update?"
      confirmText="Reload"
      cancelText="Later"
      confirmColor="green"
    />
  );
}
