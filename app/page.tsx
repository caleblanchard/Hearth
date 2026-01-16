import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/supabase/server';
import { isCloudMode } from '@/lib/deployment-mode';
import LandingPage from '@/components/landing/LandingPage';

export default async function Home() {
  const authContext = await getAuthContext();
  const cloudMode = isCloudMode();

  // If user is authenticated, redirect to dashboard
  if (authContext?.user) {
    redirect('/dashboard');
  }

  // Cloud mode: Show landing page
  if (cloudMode) {
    return <LandingPage />;
  }

  // Local mode: Redirect to sign in
  redirect('/auth/signin');
}
