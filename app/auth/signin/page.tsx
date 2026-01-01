'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ParentLoginForm from '@/components/auth/ParentLoginForm';
import ChildPinLogin from '@/components/auth/ChildPinLogin';

export default function SignInPage() {
  const [mode, setMode] = useState<'select' | 'parent' | 'child'>('select');
  const router = useRouter();

  const handleParentLogin = async (email: string, password: string) => {
    const result = await signIn('parent-login', {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/dashboard');
    } else {
      throw new Error('Invalid email or password');
    }
  };

  const handleChildLogin = async (memberId: string, pin: string) => {
    const result = await signIn('child-pin', {
      memberId,
      pin,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/dashboard');
    } else {
      throw new Error('Invalid PIN');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2">
              Hearth
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome to your household
            </p>
          </div>

          {/* Mode Selection */}
          {mode === 'select' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('parent')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md"
              >
                Parent Login
              </button>
              <button
                onClick={() => setMode('child')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 shadow-md"
              >
                Child Login
              </button>
            </div>
          )}

          {/* Parent Login Form */}
          {mode === 'parent' && (
            <div>
              <button
                onClick={() => setMode('select')}
                className="mb-4 text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
              <ParentLoginForm onLogin={handleParentLogin} />
            </div>
          )}

          {/* Child PIN Login */}
          {mode === 'child' && (
            <div>
              <button
                onClick={() => setMode('select')}
                className="mb-4 text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                ← Back
              </button>
              <ChildPinLogin onLogin={handleChildLogin} />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
          Hearth - Family-first household management
        </p>
      </div>
    </div>
  );
}
