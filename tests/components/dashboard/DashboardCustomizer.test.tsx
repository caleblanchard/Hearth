import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import { WidgetConfig } from '@/types/dashboard';

// Mock @dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: jest.fn(),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: jest.fn(),
  sortableKeyboardCoordinates: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (items: any[], oldIndex: number, newIndex: number) => {
    const newItems = [...items];
    const [removed] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, removed);
    return newItems;
  },
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

describe('DashboardCustomizer', () => {
  const mockWidgets: WidgetConfig[] = [
    {
      id: 'chores',
      enabled: true,
      order: 0,
      size: 'default',
      settings: {},
    },
    {
      id: 'calendar',
      enabled: true,
      order: 1,
      size: 'default',
      settings: {},
    },
    {
      id: 'todos',
      enabled: false,
      order: 2,
      size: 'default',
      settings: {},
    },
  ];

  const mockAvailableWidgets = [
    {
      id: 'chores',
      name: "Today's Chores",
      description: 'View and manage your daily chores',
      defaultSize: 'default' as const,
      category: 'personal' as const,
    },
    {
      id: 'calendar',
      name: 'Upcoming Events',
      description: 'View upcoming calendar events',
      defaultSize: 'default' as const,
      category: 'family' as const,
    },
    {
      id: 'todos',
      name: 'To-Do List',
      description: 'Track your personal tasks',
      defaultSize: 'default' as const,
      category: 'personal' as const,
    },
  ];

  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <DashboardCustomizer
        isOpen={false}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isOpen is true', () => {
    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('Customize Dashboard')).toBeInTheDocument();
    expect(screen.getByText("Today's Chores")).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
  });

  it('should display widget count correctly', () => {
    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    expect(screen.getByText('2 of 3 widgets visible')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should toggle widget visibility', () => {
    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    // Find all checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    
    // First widget should be visible
    expect(checkboxes[0]).toBeChecked();
    
    // Third widget should be hidden
    expect(checkboxes[2]).not.toBeChecked();

    // Toggle the first widget
    fireEvent.click(checkboxes[0]);

    // Now it should be unchecked
    expect(checkboxes[0]).not.toBeChecked();
  });

  it('should call onSave with updated widgets', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should show confirmation before reset', () => {
    global.confirm = jest.fn(() => false);

    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByText('Reset to Default');
    fireEvent.click(resetButton);

    expect(global.confirm).toHaveBeenCalled();
    expect(mockOnReset).not.toHaveBeenCalled();
  });

  it('should call onReset when confirmed', async () => {
    global.confirm = jest.fn(() => true);
    mockOnReset.mockResolvedValue(undefined);

    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const resetButton = screen.getByText('Reset to Default');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockOnReset).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable buttons while saving', async () => {
    mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <DashboardCustomizer
        isOpen={true}
        onClose={mockOnClose}
        widgets={mockWidgets}
        availableWidgets={mockAvailableWidgets}
        onSave={mockOnSave}
        onReset={mockOnReset}
      />
    );

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Buttons should be disabled
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeDisabled();
    expect(screen.getByText('Reset to Default')).toBeDisabled();

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});
