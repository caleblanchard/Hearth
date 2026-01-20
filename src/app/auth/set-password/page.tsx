'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function SetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [verifyingInvite, setVerifyingInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const next = searchParams.get('next') || '/dashboard';
  const inviteToken = searchParams.get('inviteToken');
  const tokenHash = searchParams.get('token_hash');
  const tokenType = searchParams.get('type') as
    | 'invite'
    | 'signup'
    | 'recovery'
    | 'email_change'
    | null;

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      let { data: { user } } = await supabase.auth.getUser();

      if (!user && tokenHash && tokenType) {
        setVerifyingInvite(true);
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: tokenType,
          token_hash: tokenHash,
        });
        if (verifyError) {
          setError(verifyError.message || 'Invalid or expired invitation link');
          setVerifyingInvite(false);
          setAuthReady(true);
          return;
        }
        const result = await supabase.auth.getUser();
        user = result.data.user;
        setVerifyingInvite(false);
      }

      if (user?.email) {
        setUserEmail(user.email);
      }
      setAuthReady(true);
    }
    getUser();
  }, [tokenHash, tokenType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      if (inviteToken) {
        const response = await fetch('/api/family/members/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to accept invitation');
          setLoading(false);
          return;
        }

        router.push('/dashboard?welcome=true');
        return;
      }

      if (next.startsWith('http')) {
        window.location.href = next;
        return;
      }

      // Success! Redirect to the next page
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
      setLoading(false);
    }
  };

  if (!authReady || verifyingInvite) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Preparing your account...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <svg className="h-8 w-8 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
          Set Your Password
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create a password to complete your account setup
        </p>
        {userEmail && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            {userEmail}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            placeholder="Re-enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-orange-600 px-4 py-3 text-white font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Setting Password...' : 'Set Password & Continue'}
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Your password must be at least 8 characters long.
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      }>
        <SetPasswordContent />
      </Suspense>
    </div>
  );
}
