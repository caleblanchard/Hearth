'use client';

import { useState, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface ChildPinLoginProps {
  onLogin: (memberId: string, pin: string) => Promise<void>;
}

export default function ChildPinLogin({ onLogin }: ChildPinLoginProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchChildren() {
      try {
        const response = await fetch('/api/children');
        if (response.ok) {
          const data = await response.json();
          setChildren(data);
        }
      } catch (error) {
        console.error('Failed to fetch children:', error);
      }
    }
    fetchChildren();
  }, []);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!selectedChild || pin.length < 4) {
      setError('Please enter your PIN');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await onLogin(selectedChild.id, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedChild) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-800 dark:text-white">
          Who are you?
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className="flex flex-col items-center justify-center p-6 bg-ember-300/30 dark:bg-slate-900/20 hover:bg-ember-300/40 dark:hover:bg-slate-900/30 rounded-lg transition-colors duration-200 border-2 border-transparent hover:border-ember-500"
            >
              <div className="w-16 h-16 bg-ember-300 dark:bg-ember-700 rounded-full flex items-center justify-center text-2xl font-bold text-ember-700 dark:text-ember-200 mb-2">
                {child.name.charAt(0)}
              </div>
              <span className="text-gray-800 dark:text-white font-medium">
                {child.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-ember-300 dark:bg-ember-700 rounded-full flex items-center justify-center text-3xl font-bold text-ember-700 dark:text-ember-200 mx-auto mb-3">
          {selectedChild.name.charAt(0)}
        </div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Hi, {selectedChild.name}!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Enter your PIN
        </p>
      </div>

      {/* PIN Display */}
      <div className="flex justify-center gap-2 mb-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-2xl font-bold ${
              i < pin.length
                ? 'border-ember-700 bg-ember-300/30 dark:bg-slate-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {i < pin.length ? '•' : ''}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4 text-center">
          {error}
        </div>
      )}

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePinInput(num.toString())}
            disabled={isLoading}
            className="h-16 text-2xl font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => setSelectedChild(null)}
          disabled={isLoading}
          className="h-16 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
        >
          Change
        </button>
        <button
          onClick={() => handlePinInput('0')}
          disabled={isLoading}
          className="h-16 text-2xl font-semibold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={isLoading}
          className="h-16 text-xl font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
        >
          ←
        </button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || pin.length < 4}
        className="w-full bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-md"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </div>
  );
}
