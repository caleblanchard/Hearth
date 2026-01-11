import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/supabase/server';

export default async function Home() {
  const authContext = await getAuthContext();

  if (authContext?.user) {
    redirect('/dashboard');
  } else {
    redirect('/auth/signin');
  }
}
