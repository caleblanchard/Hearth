import { Metadata } from 'next';
import { getAuthContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import KioskSettingsForm from '@/components/settings/KioskSettingsForm';

export const metadata: Metadata = {
  title: 'Kiosk Settings | Household ERP',
  description: 'Configure family kiosk mode settings',
};

export default async function KioskSettingsPage() {
  const authContext = await getAuthContext();

  if (!authContext?.user) {
    redirect('/auth/signin');
  }

  // Only parents can access settings
  const firstMembership = authContext.memberships[0];
  if (!firstMembership || firstMembership.role !== 'PARENT') {
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

      <KioskSettingsForm familyId={firstMembership.family_id} />
    </div>
  );
}
