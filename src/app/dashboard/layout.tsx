import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import GuestStatusBanner from '@/components/dashboard/GuestStatusBanner';
import { ActiveFamilyProvider } from '@/contexts/ActiveFamilyContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ActiveFamilyProvider>
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
