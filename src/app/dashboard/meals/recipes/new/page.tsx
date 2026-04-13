'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowDownTrayIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  SortableIngredientRow,
  IngredientSectionContainer,
  IngredientDragOverlayContent,
} from '@/components/recipes/IngredientDnd';

interface Ingredient {
  _dndId: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

interface IngredientSection {
  id: string;
  name: string;
  ingredients: Ingredient[];
}

interface InstructionSection {
  id: string;
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

const emptyIngredient = (): Ingredient => ({ _dndId: newIngId(), name: '', quantity: '', unit: '', notes: '' });

function newSectionId() {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function newIngId() {
  return `ing-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

export default function NewRecipePage() {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: '',
    category: '',
    difficulty: 'MEDIUM',
    prepTimeMinutes: '',
    cookTimeMinutes: '',
    servings: '4',
    imageUrl: '',
    dietaryTags: [] as string[],
  });

  // Flat (ungrouped) ingredients + named sections
  const [ungroupedIngredients, setUngroupedIngredients] = useState<Ingredient[]>([emptyIngredient()]);
  const [ingredientSections, setIngredientSections] = useState<IngredientSection[]>([]);

  // DnD for ingredients
  const [activeIngredient, setActiveIngredient] = useState<Ingredient | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Flat (ungrouped) steps + named sections
  const [ungroupedSteps, setUngroupedSteps] = useState<string[]>(['']);
  const [instructionSections, setInstructionSections] = useState<InstructionSection[]>([]);

  // ── Import handler ─────────────────────────────────────────────────────────
  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      setImportError('Please enter a URL');
      return;
    }

    setImporting(true);
    setImportError('');

    try {
      const res = await fetch('/api/meals/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to import recipe');
      }

      const { recipe } = await res.json();

      setFormData({
        name: recipe.name || '',
        description: recipe.description || '',
        notes: recipe.notes || '',
        category: recipe.category || '',
        difficulty: recipe.difficulty || 'MEDIUM',
        prepTimeMinutes: recipe.prepTimeMinutes?.toString() || '',
        cookTimeMinutes: recipe.cookTimeMinutes?.toString() || '',
        servings: recipe.servings?.toString() || '4',
        imageUrl: recipe.imageUrl || '',
        dietaryTags: recipe.dietaryTags || [],
      });

      // Handle ungrouped ingredients
      const rawUngrouped = recipe.ungroupedIngredients ?? recipe.ingredients ?? [];
      setUngroupedIngredients(
        rawUngrouped.length > 0
          ? rawUngrouped.map((ing: any) => ({
              _dndId: newIngId(),
              name: ing.name || '',
              quantity: ing.quantity?.toString() || '',
              unit: ing.unit || '',
              notes: ing.notes || '',
            }))
          : [emptyIngredient()]
      );

      // Handle ingredient sections
      const rawIngSections = recipe.ingredientSections ?? [];
      setIngredientSections(
        rawIngSections.map((sec: any) => ({
          id: newSectionId(),
          name: sec.name || '',
          ingredients: (sec.ingredients ?? []).map((ing: any) => ({
            _dndId: newIngId(),
            name: ing.name || '',
            quantity: ing.quantity?.toString() || '',
            unit: ing.unit || '',
            notes: ing.notes || '',
          })),
        }))
      );

      // Handle ungrouped steps
      const rawUngroupedSteps = recipe.ungroupedSteps ?? recipe.instructions ?? [];
      setUngroupedSteps(rawUngroupedSteps.length > 0 ? rawUngroupedSteps : ['']);

      // Handle instruction sections
      const rawInstSections = recipe.instructionSections ?? [];
      setInstructionSections(
        rawInstSections.map((sec: any) => ({
          id: newSectionId(),
          name: sec.name || '',
          steps: sec.steps && sec.steps.length > 0 ? sec.steps : [''],
        }))
      );

      setImportModalOpen(false);
      setImportUrl('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setImporting(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/meals/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          category: formData.category || undefined,
          difficulty: formData.difficulty,
          prepTimeMinutes: formData.prepTimeMinutes ? parseInt(formData.prepTimeMinutes) : undefined,
          cookTimeMinutes: formData.cookTimeMinutes ? parseInt(formData.cookTimeMinutes) : undefined,
          servings: parseInt(formData.servings) || 4,
          imageUrl: formData.imageUrl.trim() || undefined,
          sourceUrl: importUrl || undefined,
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
        throw new Error(data.error || 'Failed to create recipe');
      }

      const { recipe } = await res.json();
      router.push(`/dashboard/meals/recipes/${recipe.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe');
    } finally {
      setLoading(false);
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
    updated[i][field] = value;
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
      const validIngredients = sec.ingredients.filter(ing => ing.name.trim());
      setUngroupedIngredients(prev => [...prev, ...validIngredients]);
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
        ings[i][field] = value;
        return { ...s, ingredients: ings };
      })
    );

  // ── Ingredient DnD handlers ────────────────────────────────────────────────
  const handleIngredientDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;
    const found =
      ungroupedIngredients.find(i => i._dndId === activeId) ??
      ingredientSections.flatMap(s => s.ingredients).find(i => i._dndId === activeId) ??
      null;
    setActiveIngredient(found);
  };

  const handleIngredientDragEnd = (event: DragEndEvent) => {
    setActiveIngredient(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determine source container
    const isUngroupedSource = ungroupedIngredients.some(i => i._dndId === activeId);
    const sourceSectionId = isUngroupedSource
      ? null
      : ingredientSections.find(s => s.ingredients.some(i => i._dndId === activeId))?.id ?? null;

    // Determine dest container (overId is either a container id or an item dndId)
    const sectionIds = ingredientSections.map(s => s.id);
    let destContainerId: string | null;
    if (overId === 'ungrouped') {
      destContainerId = null;
    } else if (sectionIds.includes(overId)) {
      destContainerId = overId;
    } else {
      // overId is an ingredient dndId — find its container
      if (ungroupedIngredients.some(i => i._dndId === overId)) {
        destContainerId = null;
      } else {
        destContainerId = ingredientSections.find(s => s.ingredients.some(i => i._dndId === overId))?.id ?? null;
      }
    }

    const sourceContainerId = sourceSectionId;

    if (sourceContainerId === destContainerId) {
      // Same container — reorder
      if (destContainerId === null) {
        const oldIdx = ungroupedIngredients.findIndex(i => i._dndId === activeId);
        const newIdx = ungroupedIngredients.findIndex(i => i._dndId === overId);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          setUngroupedIngredients(arrayMove(ungroupedIngredients, oldIdx, newIdx));
        }
      } else {
        setIngredientSections(prev =>
          prev.map(s => {
            if (s.id !== destContainerId) return s;
            const oldIdx = s.ingredients.findIndex(i => i._dndId === activeId);
            const newIdx = s.ingredients.findIndex(i => i._dndId === overId);
            if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
              return { ...s, ingredients: arrayMove(s.ingredients, oldIdx, newIdx) };
            }
            return s;
          })
        );
      }
    } else {
      // Cross-container move
      let movedItem: Ingredient | undefined;
      if (sourceContainerId === null) {
        movedItem = ungroupedIngredients.find(i => i._dndId === activeId);
        setUngroupedIngredients(prev => prev.filter(i => i._dndId !== activeId));
      } else {
        const srcSection = ingredientSections.find(s => s.id === sourceContainerId);
        movedItem = srcSection?.ingredients.find(i => i._dndId === activeId);
        setIngredientSections(prev =>
          prev.map(s => {
            if (s.id !== sourceContainerId) return s;
            const remaining = s.ingredients.filter(i => i._dndId !== activeId);
            return { ...s, ingredients: remaining.length > 0 ? remaining : [emptyIngredient()] };
          })
        );
      }
      if (!movedItem) return;
      if (destContainerId === null) {
        setUngroupedIngredients(prev => [...prev, movedItem!]);
      } else {
        setIngredientSections(prev =>
          prev.map(s => {
            if (s.id !== destContainerId) return s;
            // Insert before the over item if overId is an ingredient, else append
            const overIdx = s.ingredients.findIndex(i => i._dndId === overId);
            if (overIdx !== -1) {
              const updated = [...s.ingredients];
              updated.splice(overIdx, 0, movedItem!);
              return { ...s, ingredients: updated };
            }
            return { ...s, ingredients: [...s.ingredients, movedItem!] };
          })
        );
      }
    }
  };

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
      const validSteps = sec.steps.filter(s => s.trim());
      setUngroupedSteps(prev => [...prev, ...validSteps]);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Recipes
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => { setImportUrl(''); setImportError(''); setImportModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-info/10 hover:bg-info/20 text-info rounded-lg transition-colors sm:flex-shrink-0"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Import from URL
            </button>
          </div>
        </div>

        {/* Import Modal */}
        <Modal
          isOpen={importModalOpen}
          onClose={() => { setImportModalOpen(false); setImportError(''); }}
          title="Import Recipe from URL"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="import-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Recipe URL
              </label>
              <input
                id="import-url"
                type="url"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImportFromUrl()}
                placeholder="https://example.com/my-recipe"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-info"
                disabled={importing}
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Supports most major recipe websites (AllRecipes, Food Network, NYT Cooking, and more)
              </p>
            </div>
            {importError && (
              <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setImportModalOpen(false); setImportError(''); }}
                disabled={importing}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportFromUrl}
                disabled={importing || !importUrl.trim()}
                className="px-6 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Import
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="recipe-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipe Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipe-name"
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Grandma's Chocolate Chip Cookies"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Brief description of the recipe"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Tips, substitutions, storage instructions, etc."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
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
                  <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    id="difficulty"
                    value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="prep-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prep Time (minutes)
                  </label>
                  <input
                    id="prep-time"
                    type="number"
                    min="0"
                    value={formData.prepTimeMinutes}
                    onChange={e => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label htmlFor="cook-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cook Time (minutes)
                  </label>
                  <input
                    id="cook-time"
                    type="number"
                    min="0"
                    value={formData.cookTimeMinutes}
                    onChange={e => setFormData({ ...formData, cookTimeMinutes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="30"
                  />
                </div>

                <div>
                  <label htmlFor="servings" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Servings
                  </label>
                  <input
                    id="servings"
                    type="number"
                    min="1"
                    value={formData.servings}
                    onChange={e => setFormData({ ...formData, servings: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="4"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="image-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image URL
                </label>
                <input
                  id="image-url"
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ingredients</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={addIngredientGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <FolderPlusIcon className="h-4 w-4" />
                  Add ingredient group
                </button>
                <button
                  type="button"
                  onClick={addUngroupedIngredient}
                  className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Ingredient
                </button>
              </div>
            </div>

            {/* Named ingredient sections + ungrouped — wrapped in DnD context */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleIngredientDragStart}
              onDragEnd={handleIngredientDragEnd}
            >
              {ingredientSections.map(section => (
                <div
                  key={section.id}
                  className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-750"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={section.name}
                      onChange={e => updateIngredientSectionName(section.id, e.target.value)}
                      placeholder="Section name"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => addIngredientToSection(section.id)}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors flex-shrink-0"
                      aria-label="Add ingredient to section"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Add ingredient to section</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeIngredientSection(section.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label="Remove section"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <SortableContext
                    items={section.ingredients.map(i => i._dndId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <IngredientSectionContainer id={section.id}>
                      <div className="space-y-2 pl-2 border-l-2 border-ember-200 dark:border-ember-800">
                        {section.ingredients.map((ing, i) => (
                          <SortableIngredientRow
                            key={ing._dndId}
                            dndId={ing._dndId}
                            ingredient={ing}
                            onUpdate={(field, val) => updateIngredientInSection(section.id, i, field, val)}
                            onRemove={() => removeIngredientFromSection(section.id, i)}
                          />
                        ))}
                      </div>
                    </IngredientSectionContainer>
                  </SortableContext>
                </div>
              ))}

              {/* Ungrouped ingredients */}
              {ingredientSections.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Other ingredients</p>
              )}
              <SortableContext
                items={ungroupedIngredients.map(i => i._dndId)}
                strategy={verticalListSortingStrategy}
              >
                <IngredientSectionContainer id="ungrouped">
                  <div className="space-y-3">
                    {ungroupedIngredients.map((ingredient, i) => (
                      <SortableIngredientRow
                        key={ingredient._dndId}
                        dndId={ingredient._dndId}
                        ingredient={ingredient}
                        onUpdate={(field, val) => updateUngroupedIngredient(i, field, val)}
                        onRemove={() => removeUngroupedIngredient(i)}
                      />
                    ))}
                  </div>
                </IngredientSectionContainer>
              </SortableContext>

              <DragOverlay>
                {activeIngredient && <IngredientDragOverlayContent ingredient={activeIngredient} />}
              </DragOverlay>
            </DndContext>
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Instructions</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={addInstructionGroup}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <FolderPlusIcon className="h-4 w-4" />
                  Add instruction group
                </button>
                <button
                  type="button"
                  onClick={addUngroupedStep}
                  className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Step
                </button>
              </div>
            </div>

            {/* Named instruction sections */}
            {instructionSections.map(section => (
              <div
                key={section.id}
                className="mb-4 border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-750"
              >
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={section.name}
                    onChange={e => updateInstructionSectionName(section.id, e.target.value)}
                    placeholder="Section name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => addStepToSection(section.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-ember-700 hover:bg-ember-500 text-white rounded-lg transition-colors flex-shrink-0"
                    aria-label="Add step to section"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Add step</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeInstructionSection(section.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remove section"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-2 pl-2 border-l-2 border-ember-200 dark:border-ember-800">
                  {section.steps.map((step, i) => (
                    <StepRow
                      key={i}
                      step={step}
                      index={i}
                      total={section.steps.length}
                      onUpdate={val => updateStepInSection(section.id, i, val)}
                      onRemove={() => removeStepFromSection(section.id, i)}
                      onMoveUp={() => moveStepInSection(section.id, i, 'up')}
                      onMoveDown={() => moveStepInSection(section.id, i, 'down')}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Ungrouped steps */}
            {instructionSections.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Other steps</p>
            )}
            <div className="space-y-3">
              {ungroupedSteps.map((step, i) => (
                <StepRow
                  key={i}
                  step={step}
                  index={i}
                  total={ungroupedSteps.length}
                  onUpdate={val => updateUngroupedStep(i, val)}
                  onRemove={() => removeUngroupedStep(i)}
                  onMoveUp={() => moveUngroupedStep(i, 'up')}
                  onMoveDown={() => moveUngroupedStep(i, 'down')}
                />
              ))}
            </div>
          </div>

          {/* Dietary Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Dietary Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {DIETARY_TAGS.map(tag => (
                <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.dietaryTags.includes(tag.value)}
                    onChange={() => toggleDietaryTag(tag.value)}
                    className="rounded border-gray-300 text-ember-700 focus:ring-ember-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tag.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
