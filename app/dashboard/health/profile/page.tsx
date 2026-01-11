'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  UserCircleIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { AlertModal } from '@/components/ui/Modal';

interface MedicalProfile {
  id: string;
  memberId: string;
  bloodType: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  weight: number | null;
  weightUnit: string | null;
  updatedAt: string;
  member: {
    id: string;
    name: string;
  };
}

interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatarUrl: string | null;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function MedicalProfilePage() {
  const { user } = useSupabaseSession();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Form state
  const [bloodType, setBloodType] = useState<string>('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [weight, setWeight] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<string>('lbs');

  // Input states for adding new items
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');

  // Fetch family members
  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/family');
        if (res.ok) {
          const data = await res.json();
          setMembers(data.family.members || []);
          // Auto-select current user if they're a child, or first member if parent
          if (data.family.members.length > 0) {
            if (user?.user_metadata?.role === 'CHILD') {
              setSelectedMemberId(user.id);
            } else {
              setSelectedMemberId(data.family.members[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching family members:', error);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchMembers();
    }
  }, [user]);

  // Fetch medical profile when member is selected
  useEffect(() => {
    async function fetchProfile() {
      if (!selectedMemberId) return;

      setLoading(true);
      try {
        const res = await fetch(`/api/health/profile/${selectedMemberId}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);

          // Populate form
          if (data.profile) {
            setBloodType(data.profile.bloodType || '');
            setAllergies(data.profile.allergies || []);
            setConditions(data.profile.conditions || []);
            setMedications(data.profile.medications || []);
            setWeight(data.profile.weight?.toString() || '');
            setWeightUnit(data.profile.weightUnit || 'lbs');
          } else {
            // Reset form for new profile
            setBloodType('');
            setAllergies([]);
            setConditions([]);
            setMedications([]);
            setWeight('');
            setWeightUnit('lbs');
          }
        }
      } catch (error) {
        console.error('Error fetching medical profile:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [selectedMemberId]);

  const handleSave = async () => {
    if (!selectedMemberId || user?.user_metadata?.role !== 'PARENT') return;

    setSaving(true);
    try {
      const res = await fetch(`/api/health/profile/${selectedMemberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodType: bloodType || null,
          allergies,
          conditions,
          medications,
          weight: weight ? parseFloat(weight) : null,
          weightUnit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setAlertModal({
          isOpen: true,
          title: 'Success',
          message: 'Medical profile updated successfully',
          type: 'success',
        });
      } else {
        const error = await res.json();
        setAlertModal({
          isOpen: true,
          title: 'Error',
          message: error.error || 'Failed to update medical profile',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Error saving medical profile:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to update medical profile',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addMedication = () => {
    if (newMedication.trim() && !medications.includes(newMedication.trim())) {
      setMedications([...medications, newMedication.trim()]);
      setNewMedication('');
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const isParent = user?.user_metadata?.role === 'PARENT';
  const canEdit = isParent;

  if (loading && !selectedMemberId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Medical Profiles
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage medical information for family members
        </p>
      </div>

      {/* Member Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Family Member
        </label>
        <div className="flex items-center gap-4">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={!isParent}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 disabled:opacity-50"
          >
            <option value="">Select a member...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
        </div>
        {!isParent && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Children can only view their own medical profile
          </p>
        )}
      </div>

      {selectedMemberId && (
        <div className="space-y-6">
          {/* Blood Type */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Blood Type
            </label>
            <select
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              disabled={!canEdit}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 disabled:opacity-50"
            >
              <option value="">Not specified</option>
              {BLOOD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Weight (for dosage calculations)
            </label>
            <div className="flex gap-4">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                disabled={!canEdit}
                placeholder="Enter weight"
                min="0"
                step="0.1"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 disabled:opacity-50"
              />
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                disabled={!canEdit}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500 disabled:opacity-50"
              >
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          {/* Allergies */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allergies
            </label>
            {canEdit && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                  placeholder="Add allergy (e.g., Peanuts)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500"
                />
                <button
                  onClick={addAllergy}
                  className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add
                </button>
              </div>
            )}
            <div className="space-y-2">
              {allergies.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No allergies recorded
                </p>
              ) : (
                allergies.map((allergy, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {allergy}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => removeAllergy(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chronic Conditions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chronic Conditions
            </label>
            {canEdit && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                  placeholder="Add condition (e.g., Asthma)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500"
                />
                <button
                  onClick={addCondition}
                  className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add
                </button>
              </div>
            )}
            <div className="space-y-2">
              {conditions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No chronic conditions recorded
                </p>
              ) : (
                conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {condition}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => removeCondition(index)}
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Long-term Medications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Long-term Medications
            </label>
            {canEdit && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newMedication}
                  onChange={(e) => setNewMedication(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                  placeholder="Add medication (e.g., Daily vitamin)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-ember-500"
                />
                <button
                  onClick={addMedication}
                  className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add
                </button>
              </div>
            )}
            <div className="space-y-2">
              {medications.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No long-term medications recorded
                </p>
              ) : (
                medications.map((medication, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-info/10 dark:bg-info/20 rounded-lg border border-info/30 dark:border-info/40"
                  >
                    <span className="text-gray-900 dark:text-white">
                      {medication}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => removeMedication(index)}
                        className="text-ember-700 dark:text-ember-500 hover:text-ember-500 dark:hover:text-ember-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Save Button */}
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg flex items-center gap-2 font-medium"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    Save Medical Profile
                  </>
                )}
              </button>
            </div>
          )}

          {/* Last Updated */}
          {profile && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Last updated: {new Date(profile.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {!selectedMemberId && (
        <div className="text-center py-12">
          <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Select a family member to view or edit their medical profile
          </p>
        </div>
      )}
    </div>
  );
}
