import type { Metadata, Viewport } from 'next';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';

export const metadata: Metadata = {
  title: 'Hearth - Household ERP',
  description: 'A family-first household management system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hearth',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
