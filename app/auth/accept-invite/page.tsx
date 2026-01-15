'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface InvitationDetails {
  name: string;
  email: string;
  familyName: string;
  invitedBy: string;
  expiresAt: string;
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    async function verifyInvitationAndAuth() {
      if (!token) {
        setError('Invalid invitation link. No token provided.');
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);

        // Verify the invitation token
        const response = await fetch(`/api/family/members/invite/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to verify invitation');
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
        setLoading(false);

        // If user is authenticated, automatically accept the invitation
        if (user) {
          await acceptInvitation();
        }
      } catch (err) {
        setError('Failed to verify invitation');
        setLoading(false);
      }
    }

    verifyInvitationAndAuth();
  }, [token]);

  const acceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/family/members/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteToken: token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setAccepting(false);
        return;
      }

      // Success! Redirect to dashboard
      router.push('/dashboard?welcome=true');
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Verifying invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Invitation Error
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {error}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="/auth/signin"
            className="block w-full rounded-md bg-orange-600 px-4 py-2 text-center text-white font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Go to Sign In
          </a>
          <a
            href="/"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-center text-gray-900 dark:text-gray-100 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (accepting) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Setting up your account...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <svg className="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          You're Invited!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Join {invitation?.familyName} on Hearth
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Invited by</p>
          <p className="font-medium text-gray-900 dark:text-white">{invitation?.invitedBy}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Family</p>
          <p className="font-medium text-gray-900 dark:text-white">{invitation?.familyName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your account</p>
          <p className="font-medium text-gray-900 dark:text-white">{invitation?.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{invitation?.email}</p>
        </div>
      </div>

      {isAuthenticated ? (
        <div className="space-y-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Your account is ready. Click below to join the family.
          </p>
          <button
            onClick={acceptInvitation}
            disabled={accepting}
            className="w-full rounded-md bg-orange-600 px-4 py-3 text-white font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          >
            {accepting ? 'Joining...' : 'Join Family'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Please complete the sign up process from the email you received to set your password and activate your account.
            </p>
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already set up your password?{' '}
            <a
              href={`/auth/signin?redirectTo=/auth/accept-invite?token=${token}`}
              className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-500"
            >
              Sign in here
            </a>
          </p>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          By joining, you agree to share family data with other family members.
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      }>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
