import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const session = await auth();

  // Note: Guest session validation happens client-side via useGuestSession hook
  // Server-side we only check for NextAuth session
  if (!session?.user) {
    // Don't redirect here - let client-side handle guest sessions
    // The GuestStatusBanner and DashboardContent will handle guest authentication
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardContent />
    </div>
  );
}
