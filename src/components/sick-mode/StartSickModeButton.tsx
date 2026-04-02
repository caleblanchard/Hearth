'use client';

import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface StartSickModeButtonProps {
  memberId: string;
  memberName: string;
  healthEventId?: string;
  onStarted?: () => void;
}

export default function StartSickModeButton({
  memberId,
  memberName,
  healthEventId,
  onStarted,
}: StartSickModeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleStart = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/family/sick-mode/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          healthEventId,
          notes: `Started from health event view`,
        }),
      });

      if (response.ok) {
        showToast('success', `Sick mode activated for ${memberName} 🩹`);
        onStarted?.();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to start sick mode');
      }
    } catch (error) {
      showToast('error', 'An error occurred while starting sick mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Heart className="h-4 w-4" />
          Start Sick Mode
        </>
      )}
    </button>
  );
}
