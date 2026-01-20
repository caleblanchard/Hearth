/**
 * Component Tests: Template Browser
 *
 * Tests for the rule template browser component
 * Total: 8 tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import TemplatesPage from '@/app/dashboard/rules/templates/page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({})),
}));

// Mock fetch
global.fetch = jest.fn();

describe('TemplateBrowser Component', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockTemplates = [
    {
      id: 'chore_streak_bonus',
      name: 'Chore Streak Bonus',
      description: 'Award 10 credits for 7-day chore streak',
      category: 'rewards',
      trigger: { type: 'chore_streak', config: { days: 7 } },
      actions: [{ type: 'award_credits', config: { amount: 10 } }],
      customizable: ['trigger.config.days', 'actions.0.config.amount'],
    },
    {
      id: 'screentime_warning',
      name: 'Low Screen Time Warning',
      description: 'Notify when screen time balance drops below 30 minutes',
      category: 'convenience',
      trigger: { type: 'screentime_low', config: { thresholdMinutes: 30 } },
      actions: [
        {
          type: 'send_notification',
          config: {
            recipients: ['child'],
            title: 'Screen Time Running Low',
            message: 'You have less than 30 minutes remaining.',
          },
        },
      ],
      customizable: ['trigger.config.thresholdMinutes'],
    },
    {
      id: 'medication_cooldown',
      name: 'Medication Safety Timer',
      description: 'Lock medication for 6 hours after dose given',
      category: 'safety',
      trigger: { type: 'medication_given', config: { anyMedication: true } },
      actions: [{ type: 'lock_medication', config: { hours: 6 } }],
      customizable: ['actions.0.config.hours'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: mockTemplates }),
    });
  });

  it('should render loading state initially', () => {
    render(<TemplatesPage />);

    expect(screen.getByText(/loading templates/i)).toBeInTheDocument();
  });

  it('should fetch and display templates on mount', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
      expect(screen.getByText('Low Screen Time Warning')).toBeInTheDocument();
      expect(screen.getByText('Medication Safety Timer')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/rules/templates');
  });

  it('should display template details correctly', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    // Check descriptions
    expect(screen.getByText(/award 10 credits for 7-day chore streak/i)).toBeInTheDocument();

    // Check category badges (multiple instances exist as buttons and badges)
    expect(screen.getAllByText('Rewards').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Convenience').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Safety').length).toBeGreaterThan(0);

    // Check customizable fields
    expect(screen.getByText(/2 fields can be customized/i)).toBeInTheDocument();
  });

  it('should filter templates by category', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    // Click "Safety" category filter
    const safetyButton = screen.getByRole('button', { name: 'Safety' });
    fireEvent.click(safetyButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rules/templates?category=safety');
    });
  });

  it('should reset filter when "All Categories" is clicked', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    // First select a category
    const rewardsButton = screen.getByRole('button', { name: 'Rewards' });
    fireEvent.click(rewardsButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rules/templates?category=rewards');
    });

    // Then click "All Categories"
    const allButton = screen.getByRole('button', { name: /all categories/i });
    fireEvent.click(allButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/rules/templates');
    });
  });

  it('should open template details modal', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    // Click "Details" button on first template
    const detailsButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(detailsButtons[0]);

    // Modal should be visible with template details
    await waitFor(() => {
      // Should show title in modal
      const titles = screen.getAllByText('Chore Streak Bonus');
      expect(titles.length).toBeGreaterThan(1); // One in card, one in modal

      // Should show sections (multiple instances in cards and modal)
      expect(screen.getAllByText('Trigger').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Actions').length).toBeGreaterThan(0);
    });
  });

  it('should close template details modal', async () => {
    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Chore Streak Bonus')).toBeInTheDocument();
    });

    // Open modal
    const detailsButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Trigger').length).toBeGreaterThan(0);
    });

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    // Modal should be hidden - now only the card labels remain (3 templates = 3 "Trigger" labels)
    await waitFor(() => {
      const triggerElements = screen.queryAllByText('Trigger');
      // Should only be the text in category labels, not the modal heading
      expect(triggerElements.length).toBe(3); // One per template card
    });
  });

  it('should display empty state when no templates found', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ templates: [] }),
    });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText(/no templates found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/try selecting a different category or create a custom rule/i)
      ).toBeInTheDocument();
    });
  });
});
