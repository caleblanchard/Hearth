'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface SickModeInstance {
  id: string;
  memberId: string;
  startedAt: string;
  isActive: boolean;
  member: {
    id: string;
    name: string;
  };
}

export default function SickModeBanner() {
  const [instances, setInstances] = useState<SickModeInstance[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveSickMode();
  }, []);

  const fetchActiveSickMode = async () => {
    try {
      const response = await fetch('/api/family/sick-mode/status');
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error('Failed to fetch sick mode status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = (instanceId: string) => {
    setDismissed(prev => new Set([...prev, instanceId]));
  };

  const activeInstances = instances.filter(
    inst => inst.isActive && !dismissed.has(inst.id)
  );

  if (loading || activeInstances.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {activeInstances.map(instance => (
        <div
          key={instance.id}
          className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-semibold text-amber-900">
                  Sick Mode Active
                </h3>
                <p className="text-sm text-amber-700">
                  {instance.member.name} is in sick mode. Chores are paused, routines skipped, and screen time tracking is disabled.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(instance.id)}
              className="text-amber-600 hover:text-amber-800 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
