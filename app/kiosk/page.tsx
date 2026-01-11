import { Metadata } from 'next';
import { getAuthContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KioskLayout from '@/components/kiosk/KioskLayout';
import KioskDashboard from '@/components/kiosk/KioskDashboard';

export const metadata: Metadata = {
  title: 'Family Kiosk | Household ERP',
  description: 'Family kiosk dashboard for quick access to household information',
};

export default async function KioskPage() {
  // Verify user is authenticated
  const authContext = await getAuthContext();

  if (!authContext?.user) {
    redirect('/auth/signin');
  }

  // Get the member record to check role
  // Only parents can access the kiosk setup page initially
  // Children can use kiosk mode once it's started by a parent
  const firstMembership = authContext.memberships[0];
  if (!firstMembership || firstMembership.role !== 'PARENT') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <KioskLayout familyId={firstMembership.family_id}>
        <KioskDashboard />
      </KioskLayout>
    </div>
  );
}
