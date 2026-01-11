'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import Link from 'next/link';
import { ConfirmModal } from '@/components/ui/Modal';
import StartSickModeButton from '@/components/sick-mode/StartSickModeButton';

interface HealthEvent {
  id: string;
  memberId: string;
  member: {
    id: string;
    name: string;
  };
  eventType: string;
  startedAt: string;
  endedAt: string | null;
  severity: number | null;
  notes: string | null;
  symptoms: Symptom[];
  medications: Medication[];
}

interface Symptom {
  id: string;
  symptomType: string;
  severity: number;
  notes: string | null;
  recordedAt: string;
}

interface Medication {
  id: string;
  medicationName: string;
  dosage: string;
  givenAt: string;
  givenBy: string;
  nextDoseAt: string | null;
  notes: string | null;
}

export default function HealthEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseSession();
  const eventId = params.id as string;

  const [event, setEvent] = useState<HealthEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSymptomDialog, setShowSymptomDialog] = useState(false);
  const [showMedDialog, setShowMedDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [symptomForm, setSymptomForm] = useState({
    symptomType: 'FEVER',
    severity: '5',
    notes: '',
  });

  const [medForm, setMedForm] = useState({
    medicationName: '',
    dosage: '',
    givenAt: new Date().toISOString().slice(0, 16),
    nextDoseHours: '4',
    notes: '',
  });
  const [endEventConfirmModal, setEndEventConfirmModal] = useState({ isOpen: false });

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/health/events/${eventId}`);
      if (!response.ok) {
        throw new Error('Failed to load health event');
      }

      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health event');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/health/events/${eventId}/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomType: symptomForm.symptomType,
          severity: parseInt(symptomForm.severity),
          notes: symptomForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add symptom');
      }

      setShowSymptomDialog(false);
      setSymptomForm({ symptomType: 'FEVER', severity: '5', notes: '' });
      loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symptom');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/health/events/${eventId}/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationName: medForm.medicationName,
          dosage: medForm.dosage,
          givenAt: medForm.givenAt,
          nextDoseHours: medForm.nextDoseHours ? parseFloat(medForm.nextDoseHours) : null,
          notes: medForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add medication');
      }

      setShowMedDialog(false);
      setMedForm({
        medicationName: '',
        dosage: '',
        givenAt: new Date().toISOString().slice(0, 16),
        nextDoseHours: '4',
        notes: '',
      });
      loadEvent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add medication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndEvent = async () => {
    setEndEventConfirmModal({ isOpen: true });
  };

  const confirmEndEvent = async () => {
    try {
      const response = await fetch(`/api/health/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });

      if (response.ok) {
        loadEvent();
      }
    } catch (err) {
      setError('Failed to end health event');
    } finally {
      setEndEventConfirmModal({ isOpen: false });
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'ILLNESS':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'INJURY':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'DOCTOR_VISIT':
        return 'bg-info/20 text-info dark:bg-info/30 dark:text-info';
      case 'VACCINATION':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const formatSymptomType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const getTimeUntilNextDose = (nextDoseAt: string | null) => {
    if (!nextDoseAt) return null;

    const now = new Date();
    const nextDose = new Date(nextDoseAt);
    const diffMs = nextDose.getTime() - now.getTime();

    if (diffMs < 0) return 'Ready now';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          Loading health event...
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          Health event not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/health"
          className="text-ember-700 dark:text-ember-500 hover:underline text-sm mb-2 inline-block"
        >
          ← Back to Health Events
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Health Event Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Tracking health information for {event.member.name}
            </p>
          </div>
          <div className="flex gap-3">
            {!event.endedAt && event.eventType === 'ILLNESS' && user?.role === 'PARENT' && (
              <StartSickModeButton 
                memberId={event.memberId}
                memberName={event.member.name}
                healthEventId={event.id}
                onStarted={loadEvent}
              />
            )}
            {!event.endedAt && user?.role === 'PARENT' && (
              <button
                onClick={handleEndEvent}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                End Event
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Event Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded ${getEventTypeColor(event.eventType)}`}>
              {event.eventType}
            </span>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {event.member.name}
            </h2>
            {event.severity && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Severity: {event.severity}/10
              </span>
            )}
          </div>
          {event.endedAt && (
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm font-medium">
              Ended
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Started:</span>
            <p className="text-gray-900 dark:text-gray-100 font-medium">
              {new Date(event.startedAt).toLocaleString()}
            </p>
          </div>
          {event.endedAt && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Ended:</span>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {new Date(event.endedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {event.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
            <p className="text-gray-900 dark:text-gray-100 mt-1">{event.notes}</p>
          </div>
        )}
      </div>

      {/* Symptoms Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Symptoms ({event.symptoms.length})
          </h3>
          {!event.endedAt && (
            <button
              onClick={() => setShowSymptomDialog(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              + Add Symptom
            </button>
          )}
        </div>

        {event.symptoms.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No symptoms logged yet
          </p>
        ) : (
          <div className="space-y-3">
            {event.symptoms.map((symptom) => (
              <div
                key={symptom.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {formatSymptomType(symptom.symptomType)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Severity: {symptom.severity}/10 • {new Date(symptom.recordedAt).toLocaleString()}
                    </p>
                    {symptom.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {symptom.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Medications Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Medications ({event.medications.length})
          </h3>
          {!event.endedAt && user?.role === 'PARENT' && (
            <button
              onClick={() => setShowMedDialog(true)}
              className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white text-sm rounded-lg transition-colors"
            >
              + Add Medication
            </button>
          )}
        </div>

        {event.medications.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No medications logged yet
          </p>
        ) : (
          <div className="space-y-3">
            {event.medications.map((med) => (
              <div
                key={med.id}
                className="bg-info/10 dark:bg-info/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {med.medicationName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Dosage: {med.dosage}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Given: {new Date(med.givenAt).toLocaleString()}
                    </p>
                    {med.notes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                        {med.notes}
                      </p>
                    )}
                  </div>
                  {med.nextDoseAt && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Next dose in:</p>
                      <p className="text-lg font-semibold text-ember-700 dark:text-ember-500">
                        {getTimeUntilNextDose(med.nextDoseAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Symptom Dialog */}
      {showSymptomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Log Symptom
            </h3>

            <form onSubmit={handleAddSymptom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Symptom Type *
                </label>
                <select
                  required
                  value={symptomForm.symptomType}
                  onChange={(e) => setSymptomForm({ ...symptomForm, symptomType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="FEVER">Fever</option>
                  <option value="COUGH">Cough</option>
                  <option value="SORE_THROAT">Sore Throat</option>
                  <option value="RUNNY_NOSE">Runny Nose</option>
                  <option value="HEADACHE">Headache</option>
                  <option value="STOMACH_ACHE">Stomach Ache</option>
                  <option value="VOMITING">Vomiting</option>
                  <option value="DIARRHEA">Diarrhea</option>
                  <option value="RASH">Rash</option>
                  <option value="FATIGUE">Fatigue</option>
                  <option value="LOSS_OF_APPETITE">Loss of Appetite</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity (1-10) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={symptomForm.severity}
                  onChange={(e) => setSymptomForm({ ...symptomForm, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={symptomForm.notes}
                  onChange={(e) => setSymptomForm({ ...symptomForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSymptomDialog(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Symptom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Medication Dialog */}
      {showMedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Log Medication
            </h3>

            <form onSubmit={handleAddMedication} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Medication Name *
                </label>
                <input
                  type="text"
                  required
                  value={medForm.medicationName}
                  onChange={(e) => setMedForm({ ...medForm, medicationName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Ibuprofen, Tylenol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dosage *
                </label>
                <input
                  type="text"
                  required
                  value={medForm.dosage}
                  onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., 200mg, 1 tsp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Given At *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={medForm.givenAt}
                  onChange={(e) => setMedForm({ ...medForm, givenAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hours Until Next Dose
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={medForm.nextDoseHours}
                  onChange={(e) => setMedForm({ ...medForm, nextDoseHours: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., 4, 6, 8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={medForm.notes}
                  onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMedDialog(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 rounded-lg transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Event Confirmation Modal */}
      <ConfirmModal
        isOpen={endEventConfirmModal.isOpen}
        onClose={() => setEndEventConfirmModal({ isOpen: false })}
        onConfirm={confirmEndEvent}
        title="End Health Event"
        message="Are you sure you want to mark this health event as ended?"
        confirmText="End Event"
        cancelText="Cancel"
        confirmColor="blue"
      />
    </div>
  );
}
