import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import GuestStatusBanner from '@/components/dashboard/GuestStatusBanner';
import { ActiveFamilyProvider } from '@/contexts/ActiveFamilyContext';
import FetchInterceptor from '@/components/FetchInterceptor';
import { cookies } from 'next/headers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  cookies(); // opt into dynamic rendering so kiosk headers/cookies are honored
  return (
    <ActiveFamilyProvider>
      <FetchInterceptor />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Guest Status Banner */}
          <GuestStatusBanner />

          {/* Top bar */}
          <TopBar />

          {/* Page content */}
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </ActiveFamilyProvider>
  );
}
