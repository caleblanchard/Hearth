'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useRouter } from 'next/navigation';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

export default function StartSickModePage() {
  const { user } = useSupabaseSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  const loadFamilyMembers = async () => {
    try {
      const response = await fetch('/api/family/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load family members:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/family/sick-mode/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: selectedMemberId,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start sick mode');
      }

      const memberName = members.find(m => m.id === selectedMemberId)?.name || 'Family member';
      showToast('success', `Sick mode activated for ${memberName} 🩹`);
      setNotes('');
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to start sick mode');
    } finally {
      setLoading(false);
    }
  };

  if (user?.user_metadata?.role !== 'PARENT') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">
            Only parents can start sick mode. Please contact a parent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <Heart className="h-8 w-8 text-amber-500" />
          Start Sick Mode
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Activate sick mode to temporarily relax rules and expectations
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Family Member *
            </label>
            <select
              required
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Select a family member</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose the family member who is sick
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="e.g., Has a fever and sore throat"
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
              What happens when sick mode is active:
            </h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
              <li>• Chore assignments will be paused</li>
              <li>• Morning and bedtime routines can be skipped</li>
              <li>• Screen time tracking may be paused</li>
              <li>• Non-essential notifications will be muted</li>
            </ul>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
              Configure these settings at{' '}
              <a href="/dashboard/settings/sick-mode" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                Sick Mode Settings
              </a>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedMemberId}
              className="flex-1 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5" />
                  Start Sick Mode
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          💡 Tip: Link to a Health Event
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          For better tracking, create a health event first at{' '}
          <a href="/dashboard/health" className="underline hover:text-blue-900 dark:hover:text-blue-100">
            Health & Wellness
          </a>
          , then start sick mode from there to automatically link them.
        </p>
      </div>
    </div>
  );
}
