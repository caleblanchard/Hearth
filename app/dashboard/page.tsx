import { getAuthContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const authContext = await getAuthContext();

  // Note: Guest session validation happens client-side via useGuestSession hook
  // Server-side we only check for Supabase Auth session
  if (!authContext?.user) {
    // Don't redirect here - let client-side handle guest sessions
    // The GuestStatusBanner and DashboardContent will handle guest authentication
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardContent />
    </div>
  );
}
