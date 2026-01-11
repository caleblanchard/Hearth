'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useRouter } from 'next/navigation';

interface FamilyMember {
  id: string;
  name: string;
  role: string;
}

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
  symptoms: any[];
  medications: any[];
}

interface HealthEventsResponse {
  events: HealthEvent[];
}

export default function HealthEventsList() {
  const { user } = useSupabaseSession();
  const router = useRouter();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTempDialog, setShowTempDialog] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [filterMemberId, setFilterMemberId] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean>(false);

  const [eventForm, setEventForm] = useState({
    memberId: '',
    eventType: 'ILLNESS',
    severity: '',
    notes: '',
  });

  const [tempForm, setTempForm] = useState({
    memberId: '',
    temperature: '',
    method: 'ORAL',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  // Load family members
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await fetch('/api/family');
        if (response.ok) {
          const data = await response.json();
          setMembers(data.family.members.filter((m: FamilyMember) => m.role === 'CHILD' || user?.role === 'PARENT'));
          if (data.family.members.length > 0) {
            const defaultMember = user?.role === 'CHILD' 
              ? data.family.members.find((m: FamilyMember) => m.id === user.id)
              : data.family.members.find((m: FamilyMember) => m.role === 'CHILD');
            if (defaultMember) {
              setSelectedMemberId(defaultMember.id);
              setEventForm({ ...eventForm, memberId: defaultMember.id });
              setTempForm({ ...tempForm, memberId: defaultMember.id });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load members:', err);
      }
    };
    loadMembers();
  }, [session]);

  // Load health events
  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterMemberId) params.append('memberId', filterMemberId);
      if (filterActive) params.append('active', 'true');

      const response = await fetch(`/api/health/events?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load health events');
      }

      const data: HealthEventsResponse = await response.json();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filterMemberId, filterActive]);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/health/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: eventForm.memberId,
          eventType: eventForm.eventType,
          severity: eventForm.severity ? parseInt(eventForm.severity) : null,
          notes: eventForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add health event');
      }

      setShowAddDialog(false);
      setEventForm({
        memberId: selectedMemberId || '',
        eventType: 'ILLNESS',
        severity: '',
        notes: '',
      });
      loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add health event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogTemperature = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/health/temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: tempForm.memberId,
          temperature: parseFloat(tempForm.temperature),
          method: tempForm.method,
          notes: tempForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to log temperature');
      }

      setShowTempDialog(false);
      setTempForm({
        memberId: selectedMemberId || '',
        temperature: '',
        method: 'ORAL',
        notes: '',
      });
      // Could show success message here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log temperature');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/health/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endedAt: new Date().toISOString() }),
      });

      if (response.ok) {
        loadEvents();
      }
    } catch (err) {
      setError('Failed to end health event');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading health events...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Health Events
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTempDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-lg transition-colors"
          >
            🌡️ Log Temperature
          </button>
          {(user?.role === 'PARENT' || user?.role === 'CHILD') && (
            <button
              onClick={() => setShowAddDialog(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              + Add Health Event
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Filter by Member
          </label>
          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterActive}
              onChange={(e) => setFilterActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active Only</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No health events found. Add one to get started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-ember-500 dark:hover:border-ember-400 transition-colors cursor-pointer"
              onClick={() => router.push(`/dashboard/health/${event.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getEventTypeColor(event.eventType)}`}>
                      {event.eventType}
                    </span>
                    <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {event.member.name}
                    </span>
                    {event.severity && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Severity: {event.severity}/10
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Started: {new Date(event.startedAt).toLocaleString()}
                    {event.endedAt && (
                      <span className="ml-4">
                        Ended: {new Date(event.endedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                  {event.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{event.notes}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    {event.symptoms.length > 0 && (
                      <span>🌡️ {event.symptoms.length} symptom(s)</span>
                    )}
                    {event.medications.length > 0 && (
                      <span>💊 {event.medications.length} medication(s)</span>
                    )}
                    <span className="text-ember-700 dark:text-ember-500 font-medium">
                      View Details →
                    </span>
                  </div>
                </div>
                {!event.endedAt && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEndEvent(event.id);
                    }}
                    className="px-3 py-1 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    End Event
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Health Event Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Add Health Event
            </h3>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Family Member *
                </label>
                <select
                  required
                  value={eventForm.memberId}
                  onChange={(e) => setEventForm({ ...eventForm, memberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event Type *
                </label>
                <select
                  required
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="ILLNESS">Illness</option>
                  <option value="INJURY">Injury</option>
                  <option value="DOCTOR_VISIT">Doctor Visit</option>
                  <option value="WELLNESS_CHECK">Wellness Check</option>
                  <option value="VACCINATION">Vaccination</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={eventForm.severity}
                  onChange={(e) => setEventForm({ ...eventForm, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Temperature Dialog */}
      {showTempDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Log Temperature
            </h3>

            <form onSubmit={handleLogTemperature} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Family Member *
                </label>
                <select
                  required
                  value={tempForm.memberId}
                  onChange={(e) => setTempForm({ ...tempForm, memberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select member...</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Temperature (°F) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="90"
                  max="110"
                  required
                  value={tempForm.temperature}
                  onChange={(e) => setTempForm({ ...tempForm, temperature: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="98.6"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Method *
                </label>
                <select
                  required
                  value={tempForm.method}
                  onChange={(e) => setTempForm({ ...tempForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="ORAL">Oral</option>
                  <option value="RECTAL">Rectal</option>
                  <option value="ARMPIT">Armpit</option>
                  <option value="EAR">Ear</option>
                  <option value="FOREHEAD">Forehead</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={tempForm.notes}
                  onChange={(e) => setTempForm({ ...tempForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTempDialog(false);
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
                  {submitting ? 'Logging...' : 'Log Temperature'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
