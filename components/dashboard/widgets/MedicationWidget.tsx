'use client';

import { useState, useEffect } from 'react';
import { Pill, AlertCircle } from 'lucide-react';

interface Medication {
  id: string;
  medicationName: string;
  activeIngredient: string | null;
  minIntervalHours: number;
  maxDosesPerDay: number | null;
  lastDoseAt: string | null;
  nextDoseAvailableAt: string | null;
  notifyWhenReady: boolean;
  member: {
    id: string;
    name: string;
  };
  doses: any[];
}

interface MedicationWidgetData {
  medications: Medication[];
}

export default function MedicationWidget({ memberId }: { memberId?: string } = {}) {
  const [data, setData] = useState<MedicationWidgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingDose, setMarkingDose] = useState<string | null>(null);

  useEffect(() => {
    fetchMedications();
  }, [memberId]);

  async function fetchMedications() {
    try {
      setLoading(true);
      setError(null);

      const url = memberId
        ? `/api/medications?memberId=${memberId}`
        : '/api/medications';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch medication data');
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load medications');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsTaken(medication: Medication) {
    try {
      setMarkingDose(medication.id);

      const response = await fetch('/api/medications/dose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicationSafetyId: medication.id,
          dosage: '1 dose', // Default dosage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to log dose');
      }

      // Refresh medications after logging dose
      await fetchMedications();
    } catch (err) {
      console.error('Error marking medication as taken:', err);
      alert(err instanceof Error ? err.message : 'Failed to log dose');
    } finally {
      setMarkingDose(null);
    }
  }

  // Filter medications to show only upcoming (within 24 hours) or overdue
  const relevantMedications = data?.medications.filter((med) => {
    if (!med.nextDoseAvailableAt || !med.notifyWhenReady) return false;

    const nextDose = new Date(med.nextDoseAvailableAt);
    const now = new Date();
    const hoursUntil = (nextDose.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Show if overdue (negative hours) or upcoming within 24 hours
    return hoursUntil < 24;
  }) || [];

  // Sort: overdue first, then soonest upcoming
  const sortedMedications = [...relevantMedications].sort((a, b) => {
    const timeA = new Date(a.nextDoseAvailableAt!).getTime();
    const timeB = new Date(b.nextDoseAvailableAt!).getTime();
    return timeA - timeB;
  });

  // Format time display
  const formatTime = (dateString: string): { text: string; isOverdue: boolean } => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 0) {
      const hoursOverdue = Math.abs(diffHours);
      if (hoursOverdue < 1) {
        return { text: `${Math.round(hoursOverdue * 60)}m overdue`, isOverdue: true };
      }
      return { text: `${Math.round(hoursOverdue)}h overdue`, isOverdue: true };
    }

    if (diffHours < 1) {
      return { text: `in ${Math.round(diffHours * 60)}m`, isOverdue: false };
    }
    return { text: `in ${Math.round(diffHours)}h`, isOverdue: false };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Pill className="w-5 h-5" />
          Medications
        </h2>
      </div>

      {loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      )}

      {error && (
        <div className="text-center py-8 text-red-600 dark:text-red-400">
          Failed to load medications
        </div>
      )}

      {!loading && !error && sortedMedications.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No medications scheduled
        </div>
      )}

      {!loading && !error && sortedMedications.length > 0 && (
        <div className="space-y-3">
          {sortedMedications.map((medication) => {
            const { text: timeText, isOverdue } = formatTime(medication.nextDoseAvailableAt!);

            return (
              <div
                key={medication.id}
                className={`border rounded-lg p-3 ${
                  isOverdue
                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {medication.medicationName}
                      </span>
                      {isOverdue && (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {medication.member.name}
                    </div>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {timeText}
                  </div>
                </div>

                {medication.activeIngredient && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {medication.activeIngredient}
                  </div>
                )}

                <button
                  onClick={() => handleMarkAsTaken(medication)}
                  disabled={markingDose === medication.id}
                  className="w-full mt-2 px-3 py-1.5 text-sm bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 text-white rounded transition-colors duration-200"
                >
                  {markingDose === medication.id ? 'Logging...' : 'Mark as Taken'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
