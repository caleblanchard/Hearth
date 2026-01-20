import RecipesList from '../RecipesList';

export default function RecipesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Recipe Collection
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Browse, rate, and manage your family's favorite recipes
        </p>
      </div>

      <RecipesList />
    </div>
  );
}
