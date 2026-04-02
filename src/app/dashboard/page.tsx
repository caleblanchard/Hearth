import { getAuthContext } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const authContext = await getAuthContext();

  if (!authContext?.user) {
    redirect('/auth/signin');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardContent />
    </div>
  );
}
