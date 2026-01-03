'use client';

import { useState, useEffect } from 'react';

interface MedicationDose {
  id: string;
  givenAt: string;
  givenBy: string;
  dosage: string;
  notes: string | null;
  wasOverride: boolean;
  overrideReason: string | null;
}

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
  doses: MedicationDose[];
}

interface LogDoseData {
  medicationSafetyId: string;
  dosage: string;
  notes?: string;
  override?: boolean;
  overrideReason?: string;
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMed, setSelectedMed] = useState<string | null>(null);
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadMedications();
    const interval = setInterval(loadMedications, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMedications = async () => {
    try {
      const response = await fetch('/api/medications');
      if (!response.ok) throw new Error('Failed to load medications');
      const data = await response.json();
      setMedications(data.medications);
    } catch (err) {
      console.error(err);
      setError('Failed to load medications');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeRemaining = (nextDoseAt: string | null): { locked: boolean; hours: number; minutes: number; seconds: number } => {
    if (!nextDoseAt) return { locked: false, hours: 0, minutes: 0, seconds: 0 };

    const now = new Date();
    const nextDose = new Date(nextDoseAt);
    const diffMs = nextDose.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { locked: false, hours: 0, minutes: 0, seconds: 0 };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { locked: true, hours, minutes, seconds };
  };

  const getDosesToday = (doses: MedicationDose[]): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return doses.filter(dose => {
      const doseDate = new Date(dose.givenAt);
      return doseDate >= today;
    }).length;
  };

  const handleLogDose = async (medication: Medication, override: boolean = false) => {
    if (!dosage.trim()) {
      setError('Please enter dosage');
      return;
    }

    if (override && !overrideReason.trim()) {
      setError('Override reason is required');
      return;
    }

    try {
      const logData: LogDoseData = {
        medicationSafetyId: medication.id,
        dosage: dosage.trim(),
        notes: notes.trim() || undefined,
      };

      if (override) {
        logData.override = true;
        logData.overrideReason = overrideReason.trim();
      }

      const response = await fetch('/api/medications/dose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.locked) {
          setError(`Cannot log dose: ${data.error}. Next dose available in ${data.hoursRemaining} hours.`);
        } else {
          setError(data.error || 'Failed to log dose');
        }
        return;
      }

      setSuccess(`Dose logged successfully for ${medication.member.name}`);
      setDosage('');
      setNotes('');
      setOverrideReason('');
      setSelectedMed(null);
      setShowOverrideModal(false);
      await loadMedications();

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      setError('Failed to log dose');
    }
  };

  const openOverrideModal = (medId: string) => {
    setSelectedMed(medId);
    setShowOverrideModal(true);
    setError(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading medications...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Medication Safety
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track medications with safety interlock to prevent double-dosing
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 dark:text-red-400 text-sm mt-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <p className="text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No medications configured yet. Parents can add medication safety configurations.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {medications.map(med => {
            const timeRemaining = calculateTimeRemaining(med.nextDoseAvailableAt);
            const dosesToday = getDosesToday(med.doses);
            const dailyLimitReached = med.maxDosesPerDay ? dosesToday >= med.maxDosesPerDay : false;
            const isLocked = timeRemaining.locked || dailyLimitReached;

            return (
              <div
                key={med.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-6 ${
                  isLocked
                    ? 'border-red-300 dark:border-red-700'
                    : 'border-green-300 dark:border-green-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {med.medicationName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      For: {med.member.name}
                    </p>
                    {med.activeIngredient && (
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Active: {med.activeIngredient}
                      </p>
                    )}
                  </div>
                  <div className="text-3xl">
                    {isLocked ? '🔒' : '✅'}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Min Interval:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {med.minIntervalHours} hours
                    </span>
                  </div>

                  {med.maxDosesPerDay && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Daily Limit:</span>
                      <span className={`font-medium ${dailyLimitReached ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {dosesToday} / {med.maxDosesPerDay} doses today
                      </span>
                    </div>
                  )}

                  {med.lastDoseAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Last Dose:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {new Date(med.lastDoseAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {timeRemaining.locked && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        🔒 Locked - Next dose available in:
                      </p>
                      <p className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">
                        {String(timeRemaining.hours).padStart(2, '0')}:
                        {String(timeRemaining.minutes).padStart(2, '0')}:
                        {String(timeRemaining.seconds).padStart(2, '0')}
                      </p>
                    </div>
                  )}

                  {!timeRemaining.locked && !dailyLimitReached && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                      <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                        ✅ Safe to administer next dose
                      </p>
                    </div>
                  )}

                  {dailyLimitReached && !timeRemaining.locked && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-3">
                      <p className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                        ⚠️ Daily maximum reached
                      </p>
                    </div>
                  )}
                </div>

                {selectedMed === med.id && !showOverrideModal && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                      placeholder="e.g., 5ml, 1 tablet, 200mg"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-3"
                    />

                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any notes about this dose..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedMed === med.id && !showOverrideModal ? (
                    <>
                      <button
                        onClick={() => handleLogDose(med)}
                        disabled={isLocked}
                        className={`flex-1 px-4 py-2 rounded font-medium ${
                          isLocked
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        Confirm Dose
                      </button>
                      <button
                        onClick={() => setSelectedMed(null)}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setSelectedMed(med.id)}
                        disabled={isLocked}
                        className={`flex-1 px-4 py-2 rounded font-medium ${
                          isLocked
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-ember-700 hover:bg-ember-500 text-white'
                        }`}
                      >
                        Log Dose
                      </button>
                      {isLocked && (
                        <button
                          onClick={() => openOverrideModal(med.id)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
                        >
                          Override (Parent)
                        </button>
                      )}
                    </>
                  )}
                </div>

                {med.doses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recent Doses:
                    </p>
                    <div className="space-y-2">
                      {med.doses.slice(0, 3).map(dose => (
                        <div key={dose.id} className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{dose.dosage}</span> -{' '}
                          {new Date(dose.givenAt).toLocaleString()}
                          {dose.wasOverride && (
                            <span className="ml-2 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">
                              Override
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedMed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Parent Override Required
            </h3>
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-4 mb-4">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                <strong>Warning:</strong> This medication is locked due to safety intervals.
                Overriding the safety interlock should only be done under medical guidance.
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dosage *
            </label>
            <input
              type="text"
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              placeholder="e.g., 5ml, 1 tablet"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Override Reason (Required) *
            </label>
            <textarea
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="Explain why override is necessary (e.g., doctor's orders, fever spike)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4"
            />

            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const med = medications.find(m => m.id === selectedMed);
                  if (med) handleLogDose(med, true);
                }}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
              >
                Confirm Override
              </button>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideReason('');
                  setDosage('');
                  setNotes('');
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
