'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Modal, ConfirmModal, AlertModal } from '@/components/ui/Modal';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthday: string | null;
  imageUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PetFeeding {
  id: string;
  fedAt: string;
  fedBy: string;
  foodType: string | null;
  amount: string | null;
  notes: string | null;
  member?: {
    id: string;
    name: string;
  };
}

interface PetMedication {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  lastGivenAt: string | null;
  nextDoseAt: string | null;
  isActive: boolean;
  notes: string | null;
}

interface PetVetVisit {
  id: string;
  visitDate: string;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  cost: number | null;
  nextVisit: string | null;
  notes: string | null;
}

interface PetWeight {
  id: string;
  weight: number;
  unit: string;
  recordedAt: string;
  notes: string | null;
}

export default function PetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useSupabaseSession();
  const petId = params.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [feedings, setFeedings] = useState<PetFeeding[]>([]);
  const [medications, setMedications] = useState<PetMedication[]>([]);
  const [vetVisits, setVetVisits] = useState<PetVetVisit[]>([]);
  const [weights, setWeights] = useState<PetWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showVetVisitModal, setShowVetVisitModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    species: 'DOG',
    breed: '',
    birthday: '',
    imageUrl: '',
    notes: '',
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const [medicationForm, setMedicationForm] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    minIntervalHours: '',
    notes: '',
    isActive: true,
  });

  const [vetVisitForm, setVetVisitForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    reason: '',
    diagnosis: '',
    treatment: '',
    cost: '',
    nextVisit: '',
    notes: '',
  });

  const [weightForm, setWeightForm] = useState({
    weight: '',
    unit: 'lbs',
    recordedAt: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const loadPetData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch pet details
      const petResponse = await fetch(`/api/pets/${petId}`);
      if (!petResponse.ok) {
        if (petResponse.status === 404) {
          setError('Pet not found');
          return;
        }
        throw new Error('Failed to load pet');
      }
      const petData = await petResponse.json();
      setPet(petData.pet);

      // Set form data for editing
      setFormData({
        name: petData.pet.name,
        species: petData.pet.species,
        breed: petData.pet.breed || '',
        birthday: petData.pet.birthday
          ? new Date(petData.pet.birthday).toISOString().split('T')[0]
          : '',
        imageUrl: petData.pet.imageUrl || '',
        notes: petData.pet.notes || '',
      });

      // Fetch feeding history
      const feedingsResponse = await fetch(`/api/pets/${petId}/feed`);
      if (feedingsResponse.ok) {
        const feedingsData = await feedingsResponse.json();
        setFeedings(feedingsData.feedings || []);
      }

      // Fetch medications
      const medicationsResponse = await fetch(`/api/pets/${petId}/medications`);
      if (medicationsResponse.ok) {
        const medicationsData = await medicationsResponse.json();
        setMedications(medicationsData.medications || []);
      }

      // Fetch vet visits
      const vetVisitsResponse = await fetch(`/api/pets/${petId}/vet-visits`);
      if (vetVisitsResponse.ok) {
        const vetVisitsData = await vetVisitsResponse.json();
        setVetVisits(vetVisitsData.vetVisits || []);
      }

      // Fetch weights
      const weightsResponse = await fetch(`/api/pets/${petId}/weights`);
      if (weightsResponse.ok) {
        const weightsData = await weightsResponse.json();
        setWeights(weightsData.weights || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (petId && session) {
      loadPetData();
    }
  }, [petId, user]);

  const handleUpdatePet = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/pets/${petId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          species: formData.species,
          breed: formData.breed.trim() || null,
          birthday: formData.birthday || null,
          imageUrl: formData.imageUrl.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Pet updated successfully',
        });
        setShowEditModal(false);
        await loadPetData();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update pet',
        });
      }
    } catch (err) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to update pet',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePet = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/pets/${petId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: 'Pet deleted successfully',
        });
        setShowDeleteConfirm(false);
        // Redirect to pets list after a short delay
        setTimeout(() => {
          router.push('/dashboard/pets');
        }, 1000);
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete pet',
        });
      }
    } catch (err) {
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete pet',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900 p-6 rounded-lg">
            <p className="text-red-800 dark:text-red-200">
              {error || 'Pet not found'}
            </p>
            <button
              onClick={() => router.push('/dashboard/pets')}
              className="mt-4 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Pets
            </button>
          </div>
        </div>
      </div>
    );
  }

  const speciesLabels: Record<string, string> = {
    DOG: 'Dog',
    CAT: 'Cat',
    BIRD: 'Bird',
    FISH: 'Fish',
    HAMSTER: 'Hamster',
    RABBIT: 'Rabbit',
    GUINEA_PIG: 'Guinea Pig',
    REPTILE: 'Reptile',
    OTHER: 'Other',
  };

  const calculateAge = (birthday: string | null): string => {
    if (!birthday) return 'Unknown';
    const birth = new Date(birthday);
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    if (months < 0) {
      return `${years - 1} years, ${12 + months} months`;
    }
    return `${years} years, ${months} months`;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/pets')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Pets
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {pet.imageUrl && (
                <img
                  src={pet.imageUrl}
                  alt={pet.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {pet.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {speciesLabels[pet.species] || pet.species}
                  {pet.breed && ` • ${pet.breed}`}
                </p>
              </div>
            </div>
            {user?.role === 'PARENT' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pet Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Pet Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {pet.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Species</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {speciesLabels[pet.species] || pet.species}
              </p>
            </div>
            {pet.breed && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Breed</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {pet.breed}
                </p>
              </div>
            )}
            {pet.birthday && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Birthday / Age
                </p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {new Date(pet.birthday).toLocaleDateString()} ({calculateAge(pet.birthday)})
                </p>
              </div>
            )}
            {pet.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                <p className="text-lg text-gray-900 dark:text-white whitespace-pre-wrap">
                  {pet.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Feeding History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Feeding History
            </h2>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/pets/${petId}/feed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  if (response.ok) {
                    await loadPetData(); // Reload to show new feeding
                    setAlertModal({
                      isOpen: true,
                      type: 'success',
                      title: 'Success!',
                      message: 'Feeding logged successfully',
                    });
                  }
                } catch (err) {
                  setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to log feeding',
                  });
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              🍽️ Log Feeding
            </button>
          </div>
          {feedings.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No feeding history yet. Click "Log Feeding" to record when {pet.name} was fed.
            </p>
          ) : (
            <div className="space-y-3">
              {feedings.map((feeding) => (
                <div
                  key={feeding.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Fed by {feeding.member?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(feeding.fedAt).toLocaleString()}
                        </span>
                      </div>
                      {feeding.foodType && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Food:</strong> {feeding.foodType}
                        </p>
                      )}
                      {feeding.amount && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Amount:</strong> {feeding.amount}
                        </p>
                      )}
                      {feeding.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Notes:</strong> {feeding.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medications */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Medications
            </h2>
            <button
              onClick={() => setShowMedicationModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              + Add Medication
            </button>
          </div>
          {medications.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No medications recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                          {medication.medicationName}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          medication.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {medication.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Dosage:</strong> {medication.dosage}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Frequency:</strong> {medication.frequency}
                      </p>
                      {medication.lastGivenAt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Last given:</strong> {new Date(medication.lastGivenAt).toLocaleString()}
                        </p>
                      )}
                      {medication.nextDoseAt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Next dose:</strong> {new Date(medication.nextDoseAt).toLocaleString()}
                        </p>
                      )}
                      {medication.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Notes:</strong> {medication.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vet Visits */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Vet Visits
            </h2>
            <button
              onClick={() => setShowVetVisitModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              + Add Vet Visit
            </button>
          </div>
          {vetVisits.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No vet visits recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {vetVisits.map((visit) => (
                <div
                  key={visit.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                          {new Date(visit.visitDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Reason:</strong> {visit.reason}
                      </p>
                      {visit.diagnosis && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Diagnosis:</strong> {visit.diagnosis}
                        </p>
                      )}
                      {visit.treatment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Treatment:</strong> {visit.treatment}
                        </p>
                      )}
                      {visit.cost && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Cost:</strong> ${visit.cost.toFixed(2)}
                        </p>
                      )}
                      {visit.nextVisit && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Next visit:</strong> {new Date(visit.nextVisit).toLocaleDateString()}
                        </p>
                      )}
                      {visit.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Notes:</strong> {visit.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weight Tracking */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Weight Tracking
            </h2>
            <button
              onClick={() => setShowWeightModal(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              + Add Weight
            </button>
          </div>
          {weights.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No weight records yet.
            </p>
          ) : (
            <div className="space-y-3">
              {weights.map((weight) => (
                <div
                  key={weight.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                          {weight.weight} {weight.unit}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(weight.recordedAt).toLocaleString()}
                        </span>
                      </div>
                      {weight.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Notes:</strong> {weight.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Pet"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Species *
              </label>
              <select
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="DOG">Dog</option>
                <option value="CAT">Cat</option>
                <option value="BIRD">Bird</option>
                <option value="FISH">Fish</option>
                <option value="HAMSTER">Hamster</option>
                <option value="RABBIT">Rabbit</option>
                <option value="GUINEA_PIG">Guinea Pig</option>
                <option value="REPTILE">Reptile</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Breed
              </label>
              <input
                type="text"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Golden Retriever"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Birthday
              </label>
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                rows={4}
                placeholder="Additional notes about your pet..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePet}
                disabled={saving || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 disabled:bg-ember-300 rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeletePet}
          title="Delete Pet"
          message={`Are you sure you want to delete ${pet.name}? This action cannot be undone and will delete all associated feeding records, medications, vet visits, and weight tracking.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmColor="red"
        />

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
        />

      {/* Add Medication Modal */}
      <Modal
        isOpen={showMedicationModal}
        onClose={() => {
          setShowMedicationModal(false);
          setMedicationForm({
            medicationName: '',
            dosage: '',
            frequency: '',
            minIntervalHours: '',
            notes: '',
            isActive: true,
          });
        }}
        title="Add Medication"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Medication Name *
            </label>
            <input
              type="text"
              value={medicationForm.medicationName}
              onChange={(e) => setMedicationForm({ ...medicationForm, medicationName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Heartworm Prevention"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dosage *
            </label>
            <input
              type="text"
              value={medicationForm.dosage}
              onChange={(e) => setMedicationForm({ ...medicationForm, dosage: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 1 tablet"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Frequency *
            </label>
            <select
              value={medicationForm.frequency}
              onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select frequency</option>
              <option value="Daily">Daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Every 12 hours">Every 12 hours</option>
              <option value="Every 8 hours">Every 8 hours</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="As needed">As needed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Interval (hours, optional)
            </label>
            <input
              type="number"
              value={medicationForm.minIntervalHours}
              onChange={(e) => setMedicationForm({ ...medicationForm, minIntervalHours: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={medicationForm.notes}
              onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={medicationForm.isActive}
              onChange={(e) => setMedicationForm({ ...medicationForm, isActive: e.target.checked })}
              className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Active medication
            </label>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowMedicationModal(false);
                setMedicationForm({
                  medicationName: '',
                  dosage: '',
                  frequency: '',
                  minIntervalHours: '',
                  notes: '',
                  isActive: true,
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/pets/${petId}/medications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...medicationForm,
                      minIntervalHours: medicationForm.minIntervalHours ? parseInt(medicationForm.minIntervalHours) : null,
                    }),
                  });
                  if (response.ok) {
                    await loadPetData();
                    setShowMedicationModal(false);
                    setMedicationForm({
                      medicationName: '',
                      dosage: '',
                      frequency: '',
                      minIntervalHours: '',
                      notes: '',
                      isActive: true,
                    });
                    setAlertModal({
                      isOpen: true,
                      type: 'success',
                      title: 'Success!',
                      message: 'Medication added successfully',
                    });
                  } else {
                    const data = await response.json();
                    setAlertModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Error',
                      message: data.error || 'Failed to add medication',
                    });
                  }
                } catch (err) {
                  setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to add medication',
                  });
                }
              }}
              disabled={!medicationForm.medicationName || !medicationForm.dosage || !medicationForm.frequency}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
            >
              Add Medication
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Vet Visit Modal */}
      <Modal
        isOpen={showVetVisitModal}
        onClose={() => {
          setShowVetVisitModal(false);
          setVetVisitForm({
            visitDate: new Date().toISOString().split('T')[0],
            reason: '',
            diagnosis: '',
            treatment: '',
            cost: '',
            nextVisit: '',
            notes: '',
          });
        }}
        title="Add Vet Visit"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visit Date *
            </label>
            <input
              type="date"
              value={vetVisitForm.visitDate}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, visitDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Visit *
            </label>
            <input
              type="text"
              value={vetVisitForm.reason}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Annual checkup"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Diagnosis
            </label>
            <input
              type="text"
              value={vetVisitForm.diagnosis}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, diagnosis: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Healthy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Treatment
            </label>
            <textarea
              value={vetVisitForm.treatment}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, treatment: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Treatment details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cost ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={vetVisitForm.cost}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, cost: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Next Visit Date
            </label>
            <input
              type="date"
              value={vetVisitForm.nextVisit}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, nextVisit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={vetVisitForm.notes}
              onChange={(e) => setVetVisitForm({ ...vetVisitForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowVetVisitModal(false);
                setVetVisitForm({
                  visitDate: new Date().toISOString().split('T')[0],
                  reason: '',
                  diagnosis: '',
                  treatment: '',
                  cost: '',
                  nextVisit: '',
                  notes: '',
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/pets/${petId}/vet-visits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(vetVisitForm),
                  });
                  if (response.ok) {
                    await loadPetData();
                    setShowVetVisitModal(false);
                    setVetVisitForm({
                      visitDate: new Date().toISOString().split('T')[0],
                      reason: '',
                      diagnosis: '',
                      treatment: '',
                      cost: '',
                      nextVisit: '',
                      notes: '',
                    });
                    setAlertModal({
                      isOpen: true,
                      type: 'success',
                      title: 'Success!',
                      message: 'Vet visit logged successfully',
                    });
                  } else {
                    const data = await response.json();
                    setAlertModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Error',
                      message: data.error || 'Failed to log vet visit',
                    });
                  }
                } catch (err) {
                  setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to log vet visit',
                  });
                }
              }}
              disabled={!vetVisitForm.visitDate || !vetVisitForm.reason}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 rounded-lg transition-colors"
            >
              Log Visit
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Weight Modal */}
      <Modal
        isOpen={showWeightModal}
        onClose={() => {
          setShowWeightModal(false);
          setWeightForm({
            weight: '',
            unit: 'lbs',
            recordedAt: new Date().toISOString().split('T')[0],
            notes: '',
          });
        }}
        title="Add Weight Record"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Weight *
            </label>
            <input
              type="number"
              step="0.1"
              value={weightForm.weight}
              onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              placeholder="e.g., 25.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Unit *
            </label>
            <select
              value={weightForm.unit}
              onChange={(e) => setWeightForm({ ...weightForm, unit: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="lbs">Pounds (lbs)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Recorded *
            </label>
            <input
              type="date"
              value={weightForm.recordedAt}
              onChange={(e) => setWeightForm({ ...weightForm, recordedAt: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={weightForm.notes}
              onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowWeightModal(false);
                setWeightForm({
                  weight: '',
                  unit: 'lbs',
                  recordedAt: new Date().toISOString().split('T')[0],
                  notes: '',
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`/api/pets/${petId}/weights`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(weightForm),
                  });
                  if (response.ok) {
                    await loadPetData();
                    setShowWeightModal(false);
                    setWeightForm({
                      weight: '',
                      unit: 'lbs',
                      recordedAt: new Date().toISOString().split('T')[0],
                      notes: '',
                    });
                    setAlertModal({
                      isOpen: true,
                      type: 'success',
                      title: 'Success!',
                      message: 'Weight logged successfully',
                    });
                  } else {
                    const data = await response.json();
                    setAlertModal({
                      isOpen: true,
                      type: 'error',
                      title: 'Error',
                      message: data.error || 'Failed to log weight',
                    });
                  }
                } catch (err) {
                  setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to log weight',
                  });
                }
              }}
              disabled={!weightForm.weight || !weightForm.unit}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 rounded-lg transition-colors"
            >
              Log Weight
            </button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
