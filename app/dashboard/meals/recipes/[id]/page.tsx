'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  ArrowLeftIcon,
  HeartIcon,
  ClockIcon,
  UserGroupIcon,
  LinkIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { AlertModal, ConfirmModal } from '@/components/ui/Modal';
import AddToMealModal from '@/components/meals/AddToMealModal';

interface Ingredient {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  sortOrder: number;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  difficulty: string;
  category?: string;
  imageUrl?: string;
  sourceUrl?: string;
  instructions: string;
  notes?: string;
  isFavorite: boolean;
  dietaryTags: string[];
  ingredients: Ingredient[];
  averageRating?: number;
  userRating?: number;
  creator: {
    id: string;
    name: string;
  };
  createdAt: string;
}

const DIFFICULTY_COLORS = {
  EASY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HARD: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const CATEGORY_COLORS = {
  BREAKFAST: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  LUNCH: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DINNER: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  DESSERT: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  SNACK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SIDE: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  APPETIZER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  DRINK: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
};

const DIETARY_TAG_LABELS: Record<string, string> = {
  VEGETARIAN: 'Vegetarian',
  VEGAN: 'Vegan',
  GLUTEN_FREE: 'Gluten Free',
  DAIRY_FREE: 'Dairy Free',
  NUT_FREE: 'Nut Free',
  EGG_FREE: 'Egg Free',
  SOY_FREE: 'Soy Free',
  LOW_CARB: 'Low Carb',
  KETO: 'Keto',
  PALEO: 'Paleo',
};

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title?: string; message?: string; type?: 'error' | 'success' }>({ isOpen: false });
  const [showAddToMealModal, setShowAddToMealModal] = useState(false);

  useEffect(() => {
    fetchRecipe();
  }, [params.id]);

  const fetchRecipe = async () => {
    try {
      const res = await fetch(`/api/meals/recipes/${params.id}`);
      if (!res.ok) {
        throw new Error('Recipe not found');
      }
      const data = await res.json();
      setRecipe(data.recipe);
      setRating(data.recipe.userRating || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/meals/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !recipe.isFavorite }),
      });

      if (!res.ok) throw new Error('Failed to update favorite');

      const data = await res.json();
      setRecipe(data.recipe);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleRating = async (newRating: number) => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/meals/recipes/${recipe.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      });

      if (!res.ok) throw new Error('Failed to rate recipe');

      const data = await res.json();
      setRating(newRating);
      setRecipe({ ...recipe, averageRating: data.averageRating, userRating: newRating });
    } catch (err) {
      console.error('Error rating recipe:', err);
    }
  };

  const deleteRecipe = async () => {
    if (!recipe) return;
    
    // Use ConfirmModal instead of confirm()
    setDeleteConfirmModal({ isOpen: true });
  };

  const handleConfirmDelete = async () => {
    if (!recipe) return;

    try {
      const res = await fetch(`/api/meals/recipes/${recipe.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete recipe');

      router.push('/dashboard/meals/recipes');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to delete recipe',
        type: 'error',
      });
      setDeleteConfirmModal({ isOpen: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading recipe...</div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Recipe Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'This recipe does not exist'}</p>
          <button
            onClick={() => router.push('/dashboard/meals/recipes')}
            className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    );
  }

  let instructions: string[] = [];
  try {
    if (recipe.instructions) {
      const parsed = JSON.parse(recipe.instructions);
      // Handle both array and double-stringified cases
      instructions = Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? JSON.parse(parsed) : []);
    }
  } catch (error) {
    console.error('Error parsing instructions:', error);
    instructions = [];
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/meals/recipes')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Recipes
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {recipe.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                {recipe.category && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_COLORS[recipe.category as keyof typeof CATEGORY_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                    {recipe.category}
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${DIFFICULTY_COLORS[recipe.difficulty as keyof typeof DIFFICULTY_COLORS]}`}>
                  {recipe.difficulty}
                </span>
                {recipe.dietaryTags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {DIETARY_TAG_LABELS[tag] || tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddToMealModal(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Add to Meal Plan"
              >
                <CalendarIcon className="h-6 w-6 text-gray-400 hover:text-ember-700" />
              </button>
              <button
                onClick={toggleFavorite}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {recipe.isFavorite ? (
                  <HeartSolidIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <HeartIcon className="h-6 w-6 text-gray-400" />
                )}
              </button>
              {user?.id === recipe.creator.id && (
                <button
                  onClick={deleteRecipe}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <TrashIcon className="h-6 w-6 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Image and Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Image */}
            {recipe.imageUrl && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.name}
                  className="w-full h-64 object-cover"
                />
              </div>
            )}

            {/* Quick Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Info</h2>
              <div className="space-y-3">
                {recipe.prepTimeMinutes && (
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Prep Time</div>
                      <div className="font-medium text-gray-900 dark:text-white">{recipe.prepTimeMinutes} min</div>
                    </div>
                  </div>
                )}
                {recipe.cookTimeMinutes && (
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Cook Time</div>
                      <div className="font-medium text-gray-900 dark:text-white">{recipe.cookTimeMinutes} min</div>
                    </div>
                  </div>
                )}
                {recipe.servings && (
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Servings</div>
                      <div className="font-medium text-gray-900 dark:text-white">{recipe.servings}</div>
                    </div>
                  </div>
                )}
                {recipe.sourceUrl && (
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Source</div>
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-info hover:underline truncate block"
                      >
                        {new URL(recipe.sourceUrl).hostname}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating</h2>
              <div className="space-y-3">
                {recipe.averageRating !== undefined && recipe.averageRating > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {recipe.averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      {star <= (hoverRating || rating) ? (
                        <StarSolidIcon className="h-8 w-8 text-yellow-400" />
                      ) : (
                        <StarIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="text-sm text-center text-gray-600 dark:text-gray-400">
                  {rating > 0 ? 'Your rating' : 'Rate this recipe'}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {recipe.description && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-gray-700 dark:text-gray-300">{recipe.description}</p>
              </div>
            )}

            {/* Ingredients */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.id} className="flex items-start gap-3">
                    <span className="text-ember-700 mt-1">•</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {ingredient.quantity && ingredient.unit && (
                        <strong>{ingredient.quantity} {ingredient.unit}</strong>
                      )}{' '}
                      {ingredient.name}
                      {ingredient.notes && (
                        <span className="text-gray-500 dark:text-gray-400 italic"> ({ingredient.notes})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Instructions</h2>
              <ol className="space-y-4">
                {instructions.map((step: string, index: number) => (
                  <li key={index} className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ember-700 text-white flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Notes */}
            {recipe.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
                <p className="text-gray-700 dark:text-gray-300">{recipe.notes}</p>
              </div>
            )}

            {/* Footer Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Added by {recipe.creator.name} on {new Date(recipe.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Recipe"
        message="Are you sure you want to delete this recipe?"
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title || 'Alert'}
        message={alertModal.message || ''}
        type={alertModal.type}
      />

      {/* Add to Meal Modal */}
      {recipe && (
        <AddToMealModal
          isOpen={showAddToMealModal}
          onClose={() => setShowAddToMealModal(false)}
          recipeId={recipe.id}
          recipeName={recipe.name}
        />
      )}
    </div>
  );
}
