import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KioskSettingsForm from '@/components/settings/KioskSettingsForm';

export const metadata: Metadata = {
  title: 'Kiosk Settings | Household ERP',
  description: 'Configure family kiosk mode settings',
};

export default async function KioskSettingsPage() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/auth/login');
  }

  // Only parents can access settings
  if (session.user.role !== 'PARENT') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Kiosk Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure your family kiosk mode for shared devices
        </p>
      </div>

      <KioskSettingsForm familyId={session.user.familyId} />
    </div>
  );
}
