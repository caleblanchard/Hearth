'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App is already installed (standalone mode)');
      setIsInstalled(true);
      return;
    }

    // Check if running in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      console.warn('[PWA] Not running in a secure context. PWA requires HTTPS in production.');
    }

    // Check if service worker is registered
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          console.log('[PWA] Service Worker is registered:', registration.scope);
        } else {
          console.warn('[PWA] Service Worker is not registered. Install prompt may not appear.');
        }
      });
    }

    // Track if the event fired (using a ref to avoid dependency issues)
    let eventFired = false;

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      console.log('[PWA] beforeinstallprompt event fired');
      eventFired = true;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show the install prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        const installDismissed = localStorage.getItem('pwa-install-dismissed');
        if (!installDismissed) {
          setShowPrompt(true);
        }
      }, 5000); // Show after 5 seconds
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.removeItem('pwa-install-dismissed');
    });

    // Log if the event doesn't fire (for debugging)
    const debugTimeout = setTimeout(() => {
      if (!eventFired) {
        console.warn('[PWA] beforeinstallprompt event did not fire. Possible reasons:');
        console.warn('  - App is already installed');
        console.warn('  - Not running over HTTPS (required in production)');
        console.warn('  - Service worker not registered');
        console.warn('  - Manifest.json not accessible or invalid');
        console.warn('  - Browser does not support PWA installation');
      }
    }, 10000); // Check after 10 seconds

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(debugTimeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }

    // Reset the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());

    // Show again after 7 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 text-4xl">🔥</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Install Hearth
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Install Hearth on your home screen for quick access and offline support.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 bg-ember-600 hover:bg-ember-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
