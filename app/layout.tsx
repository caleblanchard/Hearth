import type { Metadata, Viewport } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import PWAInstallPrompt from './components/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'Hearth - Household ERP',
  description: 'A family-first household management system',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Hearth - Household ERP',
    description: 'A family-first household management system',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hearth - Household ERP',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hearth - Household ERP',
    description: 'A family-first household management system',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hearth',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#E65100', // Hearth Ember 700
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegistration />
        <SessionProvider>
          {children}
          <PWAInstallPrompt />
        </SessionProvider>
      </body>
    </html>
  );
}
