'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthday: string | null;
  imageUrl: string | null;
  notes: string | null;
}

interface PetsResponse {
  pets: Pet[];
}

export default function PetsList() {
  const router = useRouter();
  const { data: session } = useSession();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedingPet, setFeedingPet] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    species: 'DOG',
    breed: '',
    birthday: '',
    imageUrl: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadPets = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/pets', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load pets');
      }

      const data: PetsResponse = await response.json();
      setPets(data.pets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPets();
  }, []);

  const handleFeed = async (petId: string) => {
    setFeedingPet(petId);
    try {
      const response = await fetch(`/api/pets/${petId}/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to log feeding');
      }

      // Success feedback could be added here
      setTimeout(() => setFeedingPet(null), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log feeding');
      setFeedingPet(null);
    }
  };

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/pets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          species: formData.species,
          breed: formData.breed || null,
          birthday: formData.birthday || null,
          imageUrl: formData.imageUrl || null,
          notes: formData.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add pet');
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        species: 'DOG',
        breed: '',
        birthday: '',
        imageUrl: '',
        notes: '',
      });
      setShowAddDialog(false);
      
      // Reload pets list
      loadPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add pet');
    } finally {
      setSubmitting(false);
    }
  };

  const getSpeciesEmoji = (species: string): string => {
    switch (species) {
      case 'DOG':
        return '🐕';
      case 'CAT':
        return '🐈';
      case 'BIRD':
        return '🐦';
      case 'FISH':
        return '🐠';
      case 'HAMSTER':
        return '🐹';
      case 'RABBIT':
        return '🐰';
      case 'GUINEA_PIG':
        return '🐹';
      case 'REPTILE':
        return '🦎';
      default:
        return '🐾';
    }
  };

  const getAge = (birthday: string | null): string => {
    if (!birthday) return '';

    const birthDate = new Date(birthday);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();

    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''} old`;
    }

    return `${years} year${years !== 1 ? 's' : ''} old`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-600 dark:text-gray-400">Loading pets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Family Pets
        </h2>
        {session?.user?.role === 'PARENT' && (
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-ember-700 hover:bg-ember-500 rounded-lg transition-colors"
            aria-label="Add pet"
          >
            + Add Pet
          </button>
        )}
      </div>

      {/* Pets Grid */}
      {pets.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            No pets yet. Add a pet to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              {/* Pet Info */}
              <div className="text-center mb-4">
                <div className="text-6xl mb-3">{getSpeciesEmoji(pet.species)}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {pet.name}
                </h3>
                {pet.breed && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {pet.breed}
                  </p>
                )}
                {pet.birthday && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getAge(pet.birthday)}
                  </p>
                )}
              </div>

              {/* Notes */}
              {pet.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                  {pet.notes}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeed(pet.id)}
                  disabled={feedingPet === pet.id}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-lg transition-colors"
                  aria-label={`Feed ${pet.name}`}
                >
                  {feedingPet === pet.id ? '✓ Fed!' : '🍽️ Feed'}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/pets/${pet.id}`)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  aria-label={`View ${pet.name} details`}
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Pet Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Add New Pet
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAddPet} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pet Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Fluffy"
                />
              </div>

              <div>
                <label htmlFor="species" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Species *
                </label>
                <select
                  id="species"
                  required
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="DOG">Dog 🐕</option>
                  <option value="CAT">Cat 🐈</option>
                  <option value="BIRD">Bird 🐦</option>
                  <option value="FISH">Fish 🐠</option>
                  <option value="HAMSTER">Hamster 🐹</option>
                  <option value="RABBIT">Rabbit 🐰</option>
                  <option value="GUINEA_PIG">Guinea Pig 🐹</option>
                  <option value="REPTILE">Reptile 🦎</option>
                  <option value="OTHER">Other 🐾</option>
                </select>
              </div>

              <div>
                <label htmlFor="breed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Breed
                </label>
                <input
                  type="text"
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., Golden Retriever"
                />
              </div>

              <div>
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Birthday
                </label>
                <input
                  type="date"
                  id="birthday"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="https://example.com/pet-photo.jpg"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Any additional information about your pet..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setError(null);
                    setFormData({
                      name: '',
                      species: 'DOG',
                      breed: '',
                      birthday: '',
                      imageUrl: '',
                      notes: '',
                    });
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
                  {submitting ? 'Adding...' : 'Add Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
