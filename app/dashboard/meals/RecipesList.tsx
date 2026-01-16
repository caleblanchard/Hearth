'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Creator {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  sortOrder: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number;
  difficulty: string;
  category: string | null;
  dietaryTags: string[];
  isFavorite: boolean;
  creator: Creator;
  ingredients: Ingredient[];
  _count: {
    ratings: number;
  };
}

interface RecipesResponse {
  recipes?: Recipe[];
  data?: Recipe[];
  pagination?: {
    page: number;
    limit: number;
    total?: number;
    totalPages?: number;
    hasMore: boolean;
  };
}

export default function RecipesList() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRecipes = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (favoritesOnly) params.set('isFavorite', 'true');
      const trimmedSearch = searchQuery.trim();
      if (trimmedSearch) params.set('search', trimmedSearch);

      const response = await fetch(`/api/meals/recipes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load recipes');
      }

      const data: RecipesResponse = await response.json();
      // Handle pagination response structure: { data: Recipe[], pagination: {...} }
      // or legacy structure: { recipes: Recipe[] }
      const recipesArray = data.data || data.recipes || [];
      setRecipes(Array.isArray(recipesArray) ? recipesArray : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [categoryFilter, favoritesOnly, searchQuery]);

  const toggleFavorite = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/meals/recipes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      loadRecipes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'MEDIUM':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'HARD':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300';
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  const hasFilters = favoritesOnly || categoryFilter || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Recipe Collection
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search recipes"
              placeholder="Search recipes..."
              className="w-56 pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-ember-500 focus:border-transparent"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Categories</option>
            <option value="BREAKFAST">Breakfast</option>
            <option value="LUNCH">Lunch</option>
            <option value="DINNER">Dinner</option>
            <option value="DESSERT">Dessert</option>
            <option value="SNACK">Snack</option>
            <option value="SIDE">Side</option>
            <option value="APPETIZER">Appetizer</option>
            <option value="DRINK">Drink</option>
          </select>
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              favoritesOnly
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            ⭐ Favorites
          </button>
          <button
            onClick={() => router.push('/dashboard/meals/recipes/new')}
            className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Recipe
          </button>
        </div>
      </div>

      {/* Recipes Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-gray-600 dark:text-gray-400">Loading recipes...</div>
        </div>
      ) : !recipes || recipes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            {hasFilters
              ? 'No recipes match your filters'
              : 'No recipes yet. Add one to get started!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(recipes || []).map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/meals/recipes/${recipe.id}`)}
            >
              {/* Header with favorite button */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex-1">
                  {recipe.name}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(recipe.id, recipe.isFavorite);
                  }}
                  className="text-2xl hover:scale-110 transition-transform"
                  aria-label={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  {recipe.isFavorite ? '⭐' : '☆'}
                </button>
              </div>

              {/* Description */}
              {recipe.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {recipe.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(recipe.difficulty)}`}>
                  {recipe.difficulty}
                </span>
                {recipe.category && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/20 dark:bg-info/30 text-info dark:text-info">
                    {recipe.category}
                  </span>
                )}
                {recipe._count?.ratings > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {recipe._count.ratings} {recipe._count.ratings === 1 ? 'rating' : 'ratings'}
                  </span>
                )}
              </div>

              {/* Time and servings */}
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                {recipe.prepTimeMinutes && (
                  <span>Prep: {recipe.prepTimeMinutes}m</span>
                )}
                {recipe.cookTimeMinutes && (
                  <span>Cook: {recipe.cookTimeMinutes}m</span>
                )}
                <span>{recipe.servings} servings</span>
              </div>

              {/* Dietary tags */}
              {recipe.dietaryTags.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {recipe.dietaryTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                    >
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}

              {/* Creator */}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                by {recipe.creator.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
