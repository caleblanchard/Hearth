'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetConfig, WidgetMetadata } from '@/types/dashboard';

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  availableWidgets: WidgetMetadata[];
  onSave: (widgets: WidgetConfig[]) => Promise<void>;
  onReset: () => Promise<void>;
}

interface SortableWidgetItemProps {
  widget: WidgetConfig;
  metadata?: WidgetMetadata;
  onToggle: (id: string) => void;
}

function SortableWidgetItem({
  widget,
  metadata,
  onToggle,
}: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Drag to reorder"
      >
        <ArrowsUpDownIcon className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">
          {metadata?.name || widget.id}
        </p>
        {metadata?.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {metadata.description}
          </p>
        )}
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={widget.enabled}
          onChange={() => onToggle(widget.id)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ember-300 dark:peer-focus:ring-ember-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-ember-600"></div>
        <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
          {widget.enabled ? 'Visible' : 'Hidden'}
        </span>
      </label>
    </div>
  );
}

export default function DashboardCustomizer({
  isOpen,
  onClose,
  widgets: initialWidgets,
  availableWidgets,
  onSave,
  onReset,
}: DashboardCustomizerProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  if (!isOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update order values
        return reordered.map((item, index) => ({
          ...item,
          order: index,
        }));
      });
    }
  };

  const handleToggle = (id: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(widgets);
      onClose();
    } catch (error) {
      console.error('Failed to save dashboard layout:', error);
      alert('Failed to save dashboard layout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        'Are you sure you want to reset to default layout? This cannot be undone.'
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      await onReset();
      onClose();
    } catch (error) {
      console.error('Failed to reset dashboard layout:', error);
      alert('Failed to reset dashboard layout. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const widgetMetadataMap = new Map(
    availableWidgets.map((w) => [w.id, w])
  );

  const enabledCount = widgets.filter((w) => w.enabled).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customize Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {enabledCount} of {widgets.length} widgets visible
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Drag widgets to reorder them, or toggle visibility using the switches.
          </p>
          
          {enabledCount < widgets.length && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> You have {widgets.length - enabledCount} hidden widget{widgets.length - enabledCount !== 1 ? 's' : ''}. 
                Scroll down to see all available widgets and toggle them on.
              </p>
            </div>
          )}
          
          {widgets.length < 14 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> More widgets will appear here when you enable additional modules in{' '}
                <a href="/dashboard/settings/modules" className="underline hover:text-blue-900 dark:hover:text-blue-100">
                  Settings
                </a>.
              </p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={widgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {widgets.map((widget) => (
                  <SortableWidgetItem
                    key={widget.id}
                    widget={widget}
                    metadata={widgetMetadataMap.get(widget.id)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 gap-4">
          <button
            onClick={handleReset}
            disabled={isResetting || isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset to Default'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving || isResetting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isResetting}
              className="px-4 py-2 text-sm font-medium text-white bg-ember-700 rounded-lg hover:bg-ember-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
