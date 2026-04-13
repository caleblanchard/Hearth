'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';

export interface SortableIngredientData {
  quantity: string;
  unit: string;
  name: string;
  notes?: string;
}

interface SortableIngredientRowProps {
  dndId: string;
  ingredient: SortableIngredientData;
  onUpdate: (field: 'quantity' | 'unit' | 'name' | 'notes', value: string) => void;
  onRemove: () => void;
}

export function SortableIngredientRow({ dndId, ingredient, onUpdate, onRemove }: SortableIngredientRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex gap-2 items-center${isDragging ? ' opacity-40' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none"
        aria-label="Drag to reorder or move to another section"
      >
        <Bars3Icon className="h-4 w-4" />
      </button>
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
        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
        aria-label="Remove ingredient"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

/** Wraps a section's ingredient list, making it a valid drop target (needed for empty sections). */
export function IngredientSectionContainer({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-8 rounded-lg transition-colors${isOver ? ' ring-2 ring-inset ring-ember-400 bg-ember-50/30 dark:bg-ember-900/10' : ''}`}
    >
      {children}
    </div>
  );
}

/** Lightweight ghost shown by DragOverlay while dragging. */
export function IngredientDragOverlayContent({ ingredient }: { ingredient: SortableIngredientData }) {
  return (
    <div className="flex gap-2 items-center bg-white dark:bg-gray-800 border border-ember-400 shadow-lg rounded-lg px-3 py-2 opacity-90">
      <Bars3Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
        {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ') || 'Ingredient'}
      </span>
    </div>
  );
}
