import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KioskLayout from '@/components/kiosk/KioskLayout';
import KioskDashboard from '@/components/kiosk/KioskDashboard';

export const metadata: Metadata = {
  title: 'Family Kiosk | Household ERP',
  description: 'Family kiosk dashboard for quick access to household information',
};

export default async function KioskPage() {
  // Verify user is authenticated
  const session = await auth();

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  // Only parents can access the kiosk setup page initially
  // Children can use kiosk mode once it's started by a parent
  if (session.user.role !== 'PARENT') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <KioskLayout familyId={session.user.familyId}>
        <KioskDashboard />
      </KioskLayout>
    </div>
  );
}
