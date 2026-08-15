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

  const activeMembership =
    authContext.memberships.find(
      (membership) => membership.id === authContext.activeMemberId
    ) ??
    authContext.memberships.find(
      (membership) => membership.family_id === authContext.activeFamilyId
    ) ??
    authContext.memberships[0];

  if (!activeMembership || activeMembership.role !== 'PARENT') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <KioskSettingsForm familyId={activeMembership.family_id} />
    </div>
  );
}
