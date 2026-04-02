import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GraceRequestButton from '@/components/screentime/GraceRequestButton';

// Mock fetch
global.fetch = jest.fn();

describe('GraceRequestButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const mockStatus = {
    canRequestGrace: true,
    currentBalance: 5,
    lowBalanceWarning: true,
    remainingDailyRequests: 1,
    remainingWeeklyRequests: 3,
    nextResetTime: '2025-01-02T00:00:00Z',
    settings: {
      gracePeriodMinutes: 15,
      maxGracePerDay: 1,
      maxGracePerWeek: 3,
      requiresApproval: false,
    },
  };

  it('should render when balance is low and grace is available', () => {
    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    expect(screen.getByText(/Running low on screen time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finish the Round/i })).toBeInTheDocument();
  });

  it('should not render when balance is not low', () => {
    const highBalanceStatus = {
      ...mockStatus,
      lowBalanceWarning: false,
      currentBalance: 60,
    };

    const { container } = render(
      <GraceRequestButton
        status={highBalanceStatus}
        onGraceGranted={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should not render when grace is not available', () => {
    const noGraceStatus = {
      ...mockStatus,
      canRequestGrace: false,
      remainingDailyRequests: 0,
    };

    const { container } = render(
      <GraceRequestButton
        status={noGraceStatus}
        onGraceGranted={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show remaining daily requests', () => {
    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    expect(screen.getByText(/1 more "Finish the Round" today/i)).toBeInTheDocument();
  });

  it('should open modal when button clicked', () => {
    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    const button = screen.getByRole('button', { name: /Finish the Round/i });
    fireEvent.click(button);

    expect(screen.getByRole('heading', { name: /Request Grace Period/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Optional: Why do you need more time/i)).toBeInTheDocument();
  });

  it('should submit grace request with reason', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        graceLog: { minutesGranted: 15 },
        newBalance: 20,
      }),
    });

    const onGraceGranted = jest.fn();

    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={onGraceGranted}
      />
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Finish the Round/i }));

    // Enter reason
    const reasonInput = screen.getByPlaceholderText(/Optional: Why do you need more time/i);
    fireEvent.change(reasonInput, { target: { value: 'Middle of game level' } });

    // Submit
    const requestButton = screen.getByRole('button', { name: 'Request Grace Period' });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/screentime/grace/request',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Middle of game level' }),
        })
      );
    });

    await waitFor(() => {
      expect(onGraceGranted).toHaveBeenCalledWith(20);
    });
  });

  it('should show loading state during request', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish the Round/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Grace Period' }));

    expect(screen.getByText('Requesting...')).toBeInTheDocument();
  });

  it('should display success message after grant', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        graceLog: { minutesGranted: 15 },
        newBalance: 20,
      }),
    });

    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish the Round/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Grace Period' }));

    await waitFor(() => {
      expect(screen.getByText(/Grace period granted/i)).toBeInTheDocument();
    });
  });

  it('should display pending approval message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        pendingApproval: true,
      }),
    });

    const approvalStatus = {
      ...mockStatus,
      settings: {
        ...mockStatus.settings,
        requiresApproval: true,
      },
    };

    render(
      <GraceRequestButton
        status={approvalStatus}
        onGraceGranted={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish the Round/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Grace Period' }));

    await waitFor(() => {
      expect(screen.getByText(/pending approval/i)).toBeInTheDocument();
    });
  });

  it('should display error message on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'Daily limit exceeded',
      }),
    });

    render(
      <GraceRequestButton
        status={mockStatus}
        onGraceGranted={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Finish the Round/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Request Grace Period' }));

    await waitFor(() => {
      expect(screen.getByText(/Daily limit exceeded/i)).toBeInTheDocument();
    });
  });
});
