'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  member: {
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
  const { data: session } = useSession();
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

      // Fetch related data (feedings, medications, vet visits, weights)
      // Note: These endpoints may need to be created if they don't exist
      // For now, we'll just load the pet details
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
  }, [petId, session]);

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
            {session?.user?.role === 'PARENT' && (
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

        {/* Placeholder for future sections */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Care History
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Feeding history, medications, vet visits, and weight tracking will be displayed here.
          </p>
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
      </div>
    </div>
  );
}
