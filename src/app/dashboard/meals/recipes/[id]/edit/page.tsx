'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';

interface Ingredient {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
  sortOrder?: number;
}

interface IngredientSection {
  id: string;
  dbId?: string;
  name: string;
  ingredients: Ingredient[];
}

interface InstructionSection {
  id: string;
  dbId?: string;
  name: string;
  steps: string[];
}

const DIETARY_TAGS = [
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'GLUTEN_FREE', label: 'Gluten Free' },
  { value: 'DAIRY_FREE', label: 'Dairy Free' },
  { value: 'NUT_FREE', label: 'Nut Free' },
  { value: 'EGG_FREE', label: 'Egg Free' },
  { value: 'SOY_FREE', label: 'Soy Free' },
  { value: 'LOW_CARB', label: 'Low Carb' },
  { value: 'KETO', label: 'Keto' },
  { value: 'PALEO', label: 'Paleo' },
];

const emptyIngredient = (): Ingredient => ({ name: '', quantity: '', unit: '', notes: '' });

function newSectionId() {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function IngredientRow({
  ingredient,
  onUpdate,
  onRemove,
}: {
  ingredient: Ingredient;
  onUpdate: (field: keyof Ingredient, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        step="any"
        value={ingredient.quantity}
        onChange={e => onUpdate('quantity', e.target.value)}
        placeholder="Qty"
        className="w-14 sm:w-24 px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <input
        type="text"
        value={ingredient.unit}
        onChange={e => onUpdate('unit', e.target.value)}
        placeholder="Unit"
        className="w-20 sm:w-32 px-2 sm:px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <input
        type="text"
        value={ingredient.name}
        onChange={e => onUpdate('name', e.target.value)}
        placeholder="Ingredient name"
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        aria-label="Remove ingredient"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: string;
  index: number;
  total: number;
  onUpdate: (val: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex gap-2">
      <span className="flex-shrink-0 w-8 h-10 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400">
        {index + 1}.
      </span>
      <textarea
        value={step}
        onChange={e => onUpdate(e.target.value)}
        placeholder={`Step ${index + 1}`}
        rows={2}
        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move up"
        >
          <ChevronUpIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Move down"
        >
          <ChevronDownIcon className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        aria-label="Remove step"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty: 'MEDIUM',
    prepTimeMinutes: '',
    cookTimeMinutes: '',
    servings: '4',
    imageUrl: '',
    sourceUrl: '',
    dietaryTags: [] as string[],
  });

  const [ungroupedIngredients, setUngroupedIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [ingredientSections, setIngredientSections] = useState<IngredientSection[]>([]);
  const [ungroupedSteps, setUngroupedSteps] = useState<string[]>(['']);
  const [instructionSections, setInstructionSections] = useState<InstructionSection[]>([]);

  useEffect(() => {
    params.then(p => setRecipeId(p.id));
  }, [params]);

  useEffect(() => {
    if (recipeId) fetchRecipe();
  }, [recipeId]);

  const fetchRecipe = async () => {
    if (!recipeId) return;
    try {
      const res = await fetch(`/api/meals/recipes/${recipeId}`);
      if (!res.ok) throw new Error('Recipe not found');
      const { recipe } = await res.json();

      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        category: recipe.category || '',
        difficulty: recipe.difficulty || 'MEDIUM',
        prepTimeMinutes: recipe.prepTimeMinutes?.toString() || '',
        cookTimeMinutes: recipe.cookTimeMinutes?.toString() || '',
        servings: recipe.servings?.toString() || '4',
        imageUrl: recipe.imageUrl || '',
        sourceUrl: recipe.sourceUrl || '',
        dietaryTags: recipe.dietaryTags || [],
      });

      // Load ingredient sections
      if (recipe.ingredientSections && recipe.ingredientSections.length > 0) {
        setIngredientSections(
          recipe.ingredientSections.map((sec: any) => ({
            id: newSectionId(),
            dbId: sec.id,
            name: sec.name || '',
            ingredients: (sec.ingredients ?? []).map((ing: any) => ({
              id: ing.id,
              name: ing.name || '',
              quantity: ing.quantity?.toString() || '',
              unit: ing.unit || '',
              notes: ing.notes || '',
            })),
          }))
        );
      }

      // Load ungrouped ingredients
      const rawUngrouped = recipe.ungroupedIngredients ?? recipe.ingredients ?? [];
      setUngroupedIngredients(
        rawUngrouped.length > 0
          ? rawUngrouped.map((ing: any) => ({
              id: ing.id,
              name: ing.name || '',
              quantity: ing.quantity?.toString() || '',
              unit: ing.unit || '',
              notes: ing.notes || '',
            }))
          : [emptyIngredient()]
      );

      // Load instruction sections
      if (recipe.instructionSections && recipe.instructionSections.length > 0) {
        setInstructionSections(
          recipe.instructionSections.map((sec: any) => ({
            id: newSectionId(),
            dbId: sec.id,
            name: sec.name || '',
            steps: (sec.steps ?? []).map((s: any) => s.text ?? s),
          }))
        );
      }

      // Load ungrouped steps
      if (recipe.ungroupedSteps && recipe.ungroupedSteps.length > 0) {
        setUngroupedSteps(recipe.ungroupedSteps.map((s: any) => s.text ?? s));
      } else if (recipe.instructions) {
        // Legacy fallback
        try {
          const parsed = JSON.parse(recipe.instructions);
          const arr = Array.isArray(parsed) ? parsed : (typeof parsed === 'string' ? JSON.parse(parsed) : []);
          setUngroupedSteps(arr.length > 0 ? arr : ['']);
        } catch {
          setUngroupedSteps(['']);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/meals/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category || undefined,
          difficulty: formData.difficulty,
          prepTimeMinutes: formData.prepTimeMinutes ? parseInt(formData.prepTimeMinutes) : undefined,
          cookTimeMinutes: formData.cookTimeMinutes ? parseInt(formData.cookTimeMinutes) : undefined,
          servings: parseInt(formData.servings) || 4,
          imageUrl: formData.imageUrl.trim() || undefined,
          sourceUrl: formData.sourceUrl.trim() || undefined,
          dietaryTags: formData.dietaryTags,
          ungroupedIngredients: ungroupedIngredients
            .filter(ing => ing.name.trim())
            .map((ing, i) => ({
              name: ing.name.trim(),
              quantity: ing.quantity ? parseFloat(ing.quantity) : undefined,
              unit: ing.unit.trim() || undefined,
              notes: ing.notes.trim() || undefined,
              sortOrder: i,
            })),
          ingredientSections: ingredientSections.map((sec, si) => ({
            name: sec.name.trim() || `Section ${si + 1}`,
            sortOrder: si,
            ingredients: sec.ingredients
              .filter(ing => ing.name.trim())
              .map((ing, i) => ({
                name: ing.name.trim(),
                quantity: ing.quantity ? parseFloat(ing.quantity) : undefined,
                unit: ing.unit.trim() || undefined,
                notes: ing.notes.trim() || undefined,
                sortOrder: i,
              })),
          })),
          ungroupedSteps: ungroupedSteps.filter(s => s.trim()),
          instructionSections: instructionSections.map((sec, si) => ({
            name: sec.name.trim() || `Section ${si + 1}`,
            sortOrder: si,
            steps: sec.steps.filter(s => s.trim()),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update recipe');
      }

      router.push(`/dashboard/meals/recipes/${recipeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
    } finally {
      setSaving(false);
    }
  };

  // ── Ungrouped ingredient helpers ───────────────────────────────────────────
  const addUngroupedIngredient = () =>
    setUngroupedIngredients([...ungroupedIngredients, emptyIngredient()]);

  const removeUngroupedIngredient = (i: number) => {
    if (ungroupedIngredients.length > 1)
      setUngroupedIngredients(ungroupedIngredients.filter((_, idx) => idx !== i));
  };

  const updateUngroupedIngredient = (i: number, field: keyof Ingredient, value: string) => {
    const updated = [...ungroupedIngredients];
    (updated[i][field] as string) = value;
    setUngroupedIngredients(updated);
  };

  // ── Ingredient section helpers ─────────────────────────────────────────────
  const addIngredientGroup = () =>
    setIngredientSections([
      ...ingredientSections,
      { id: newSectionId(), name: '', ingredients: [emptyIngredient()] },
    ]);

  const removeIngredientSection = (sectionId: string) => {
    const sec = ingredientSections.find(s => s.id === sectionId);
    if (sec) {
      const valid = sec.ingredients.filter(ing => ing.name.trim());
      setUngroupedIngredients(prev => [...prev, ...valid]);
    }
    setIngredientSections(ingredientSections.filter(s => s.id !== sectionId));
  };

  const updateIngredientSectionName = (sectionId: string, name: string) =>
    setIngredientSections(ingredientSections.map(s => (s.id === sectionId ? { ...s, name } : s)));

  const addIngredientToSection = (sectionId: string) =>
    setIngredientSections(
      ingredientSections.map(s =>
        s.id === sectionId ? { ...s, ingredients: [...s.ingredients, emptyIngredient()] } : s
      )
    );

  const removeIngredientFromSection = (sectionId: string, i: number) =>
    setIngredientSections(
      ingredientSections.map(s =>
        s.id === sectionId && s.ingredients.length > 1
          ? { ...s, ingredients: s.ingredients.filter((_, idx) => idx !== i) }
          : s
      )
    );

  const updateIngredientInSection = (sectionId: string, i: number, field: keyof Ingredient, value: string) =>
    setIngredientSections(
      ingredientSections.map(s => {
        if (s.id !== sectionId) return s;
        const ings = [...s.ingredients];
        (ings[i][field] as string) = value;
        return { ...s, ingredients: ings };
      })
    );

  // ── Ungrouped step helpers ─────────────────────────────────────────────────
  const addUngroupedStep = () => setUngroupedSteps([...ungroupedSteps, '']);

  const removeUngroupedStep = (i: number) => {
    if (ungroupedSteps.length > 1)
      setUngroupedSteps(ungroupedSteps.filter((_, idx) => idx !== i));
  };

  const updateUngroupedStep = (i: number, value: string) => {
    const updated = [...ungroupedSteps];
    updated[i] = value;
    setUngroupedSteps(updated);
  };

  const moveUngroupedStep = (i: number, dir: 'up' | 'down') => {
    const updated = [...ungroupedSteps];
    if (dir === 'up' && i > 0) [updated[i - 1], updated[i]] = [updated[i], updated[i - 1]];
    else if (dir === 'down' && i < updated.length - 1) [updated[i], updated[i + 1]] = [updated[i + 1], updated[i]];
    setUngroupedSteps(updated);
  };

  // ── Instruction section helpers ────────────────────────────────────────────
  const addInstructionGroup = () =>
    setInstructionSections([
      ...instructionSections,
      { id: newSectionId(), name: '', steps: [''] },
    ]);

  const removeInstructionSection = (sectionId: string) => {
    const sec = instructionSections.find(s => s.id === sectionId);
    if (sec) {
      const valid = sec.steps.filter(s => s.trim());
      setUngroupedSteps(prev => [...prev, ...valid]);
    }
    setInstructionSections(instructionSections.filter(s => s.id !== sectionId));
  };

  const updateInstructionSectionName = (sectionId: string, name: string) =>
    setInstructionSections(instructionSections.map(s => (s.id === sectionId ? { ...s, name } : s)));

  const addStepToSection = (sectionId: string) =>
    setInstructionSections(
      instructionSections.map(s =>
        s.id === sectionId ? { ...s, steps: [...s.steps, ''] } : s
      )
    );

  const removeStepFromSection = (sectionId: string, i: number) =>
    setInstructionSections(
      instructionSections.map(s =>
        s.id === sectionId && s.steps.length > 1
          ? { ...s, steps: s.steps.filter((_, idx) => idx !== i) }
          : s
      )
    );

  const updateStepInSection = (sectionId: string, i: number, value: string) =>
    setInstructionSections(
      instructionSections.map(s => {
        if (s.id !== sectionId) return s;
        const steps = [...s.steps];
        steps[i] = value;
        return { ...s, steps };
      })
    );

  const moveStepInSection = (sectionId: string, i: number, dir: 'up' | 'down') =>
    setInstructionSections(
      instructionSections.map(s => {
        if (s.id !== sectionId) return s;
        const steps = [...s.steps];
        if (dir === 'up' && i > 0) [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
        else if (dir === 'down' && i < steps.length - 1) [steps[i], steps[i + 1]] = [steps[i + 1], steps[i]];
        return { ...s, steps };
      })
    );

  const toggleDietaryTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter(t => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  };

  // ── Shared sub-components ──────────────────────────────────────────────────


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading recipe...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/dashboard/meals/recipes/${recipeId}`)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Recipe
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Recipe</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="recipe-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipe Name <span className="text-red-500">*</span>
                </label>
                <input id="recipe-name" type="text" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Grandma's Chocolate Chip Cookies" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea id="description" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the recipe" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select id="category" value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">Select category</option>
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="DESSERT">Dessert</option>
                    <option value="SNACK">Snack</option>
                    <option value="SIDE">Side Dish</option>
                    <option value="APPETIZER">Appetizer</option>
                    <option value="DRINK">Drink</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty</label>
                  <select id="difficulty" value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prep-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prep Time (minutes)</label>
                  <input id="prep-time" type="number" min="0" value={formData.prepTimeMinutes}
                    onChange={e => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="15" />
                </div>
                <div>
                  <label htmlFor="cook-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cook Time (minutes)</label>
                  <input id="cook-time" type="number" min="0" value={formData.cookTimeMinutes}
                    onChange={e => setFormData({ ...formData, cookTimeMinutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="30" />
                </div>
                <div>
                  <label htmlFor="servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Servings</label>
                  <input id="servings" type="number" min="1" value={formData.servings}
                    onChange={e => setFormData({ ...formData, servings: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="4" />
                </div>
              </div>
              <div>
                <label htmlFor="image-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                <input id="image-url" type="url" value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg" />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ingredients</h2>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={addIngredientGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                  <FolderPlusIcon className="h-4 w-4" />
                  Add ingredient group
                </button>
                <button type="button" onClick={addUngroupedIngredient}
                  className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusIcon className="h-4 w-4" />
                  Add Ingredient
                </button>
              </div>
            </div>

            {ingredientSections.map(section => (
              <div key={section.id} className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-750">
                <div className="flex items-center gap-2 mb-3">
                  <input type="text" value={section.name}
                    onChange={e => updateIngredientSectionName(section.id, e.target.value)}
                    placeholder="Section name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium" />
                  <button type="button" onClick={() => addIngredientToSection(section.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors flex-shrink-0"
                    aria-label="Add ingredient to section">
                    <PlusIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Add ingredient to section</span>
                  </button>
                  <button type="button" onClick={() => removeIngredientSection(section.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remove section">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-ember-200 dark:border-ember-800">
                  {section.ingredients.map((ing, i) => (
                    <IngredientRow key={i} ingredient={ing}
                      onUpdate={(field, val) => updateIngredientInSection(section.id, i, field, val)}
                      onRemove={() => removeIngredientFromSection(section.id, i)} />
                  ))}
                </div>
              </div>
            ))}

            {ingredientSections.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Other ingredients</p>
            )}
            <div className="space-y-3">
              {ungroupedIngredients.map((ingredient, i) => (
                <IngredientRow key={i} ingredient={ingredient}
                  onUpdate={(field, val) => updateUngroupedIngredient(i, field, val)}
                  onRemove={() => removeUngroupedIngredient(i)} />
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Instructions</h2>
              <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={addInstructionGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                  <FolderPlusIcon className="h-4 w-4" />
                  Add instruction group
                </button>
                <button type="button" onClick={addUngroupedStep}
                  className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg text-sm font-medium transition-colors">
                  <PlusIcon className="h-4 w-4" />
                  Add Step
                </button>
              </div>
            </div>

            {instructionSections.map(section => (
              <div key={section.id} className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-750">
                <div className="flex items-center gap-2 mb-3">
                  <input type="text" value={section.name}
                    onChange={e => updateInstructionSectionName(section.id, e.target.value)}
                    placeholder="Section name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium" />
                  <button type="button" onClick={() => addStepToSection(section.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors flex-shrink-0"
                    aria-label="Add step to section">
                    <PlusIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Add step</span>
                  </button>
                  <button type="button" onClick={() => removeInstructionSection(section.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remove section">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-ember-200 dark:border-ember-800">
                  {section.steps.map((step, i) => (
                    <StepRow key={i} step={step} index={i} total={section.steps.length}
                      onUpdate={val => updateStepInSection(section.id, i, val)}
                      onRemove={() => removeStepFromSection(section.id, i)}
                      onMoveUp={() => moveStepInSection(section.id, i, 'up')}
                      onMoveDown={() => moveStepInSection(section.id, i, 'down')} />
                  ))}
                </div>
              </div>
            ))}

            {instructionSections.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Other steps</p>
            )}
            <div className="space-y-3">
              {ungroupedSteps.map((step, i) => (
                <StepRow key={i} step={step} index={i} total={ungroupedSteps.length}
                  onUpdate={val => updateUngroupedStep(i, val)}
                  onRemove={() => removeUngroupedStep(i)}
                  onMoveUp={() => moveUngroupedStep(i, 'up')}
                  onMoveDown={() => moveUngroupedStep(i, 'down')} />
              ))}
            </div>
          </div>

          {/* Dietary Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Dietary Information</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {DIETARY_TAGS.map(tag => (
                <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.dietaryTags.includes(tag.value)}
                    onChange={() => toggleDietaryTag(tag.value)}
                    className="rounded border-gray-300 text-ember-700 focus:ring-ember-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tag.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button type="button" onClick={() => router.push(`/dashboard/meals/recipes/${recipeId}`)}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300 transition-colors"
              disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
