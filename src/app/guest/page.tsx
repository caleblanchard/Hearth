'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestRedeemPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{
    guestName: string;
    accessLevel: string;
    expiresAt: string;
  } | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/auth/guest/${inviteCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to redeem invite code');
      }

      const data = await response.json();
      setSuccess(true);
      setGuestInfo({
        guestName: data.invite.guestName,
        accessLevel: data.invite.accessLevel,
        expiresAt: data.invite.expiresAt,
      });

      // Store session token in localStorage
      if (data.session?.sessionToken) {
        localStorage.setItem('guestSessionToken', data.session.sessionToken);
        // Also set it in sessionStorage for cross-tab sync
        sessionStorage.setItem('guestSessionToken', data.session.sessionToken);
      }

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redeem invite code');
    } finally {
      setLoading(false);
    }
  };

  const getAccessLevelDescription = (level: string): string => {
    const descriptions: Record<string, string> = {
      VIEW_ONLY: 'You can view family information but cannot make changes',
      LIMITED: 'You have limited access to interact with some features',
      CAREGIVER: 'You have full access for caregiving needs',
    };
    return descriptions[level] || '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-canvas-50 to-canvas-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Guest Access
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your invite code to access the family dashboard
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          {!success ? (
            <>
              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Redeem Form */}
              <form onSubmit={handleRedeem} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    6-Digit Invite Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-ember-500 focus:border-ember-500"
                    placeholder="000000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Enter the 6-digit code provided by your family
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || inviteCode.length !== 6}
                  className="w-full px-6 py-3 bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white text-lg font-semibold rounded-lg transition-colors"
                >
                  {loading ? 'Verifying...' : 'Access Dashboard'}
                </button>
              </form>

              {/* Info Section */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What is guest access?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Guest access allows family helpers like babysitters, grandparents, or caregivers
                  to temporarily access the family dashboard with limited permissions.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="text-center">
                <div className="mb-4 inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Welcome, {guestInfo?.guestName}!
                </h2>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your invite code has been verified successfully.
                </p>

                {/* Access Info */}
                {guestInfo && (
                  <div className="bg-info/10 dark:bg-info/20 rounded-lg p-4 mb-6">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-300 mb-2">
                      Access Level: {guestInfo.accessLevel.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-info dark:text-info">
                      {getAccessLevelDescription(guestInfo.accessLevel)}
                    </p>
                    <p className="text-xs text-ember-700 dark:text-ember-500 mt-2">
                      Valid until {new Date(guestInfo.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Redirecting you to the dashboard...
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Need help? Contact the family who invited you.
        </p>
      </div>
    </div>
  );
}
