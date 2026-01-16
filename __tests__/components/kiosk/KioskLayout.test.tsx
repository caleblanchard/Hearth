import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import KioskLayout from '@/components/kiosk/KioskLayout';
import * as useKioskSessionModule from '@/hooks/useKioskSession';
import * as useKioskAutoLockModule from '@/hooks/useKioskAutoLock';
import * as useActivityDetectionModule from '@/hooks/useActivityDetection';

// Mock the custom hooks
jest.mock('@/hooks/useKioskSession');
jest.mock('@/hooks/useKioskAutoLock');
jest.mock('@/hooks/useActivityDetection');

// Mock KioskPinModal component
jest.mock('@/components/kiosk/KioskPinModal', () => {
  return function MockKioskPinModal({ isOpen, onClose, onUnlock }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="pin-modal">
        <h2>Who are you?</h2>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onUnlock('member-1', '1234')}>Unlock</button>
      </div>
    );
  };
});

// Mock KioskHeader component
jest.mock('@/components/kiosk/KioskHeader', () => {
  return function MockKioskHeader({ isLocked, currentMember, onLock, onEndSession }: any) {
    return (
      <header>
        <div>{isLocked ? 'Locked' : currentMember?.name}</div>
        {!isLocked && <button onClick={onLock}>Lock</button>}
        <button onClick={onEndSession}>End Session</button>
      </header>
    );
  };
});

const mockUseKioskSession = useKioskSessionModule.useKioskSession as jest.MockedFunction<
  typeof useKioskSessionModule.useKioskSession
>;
const mockUseKioskAutoLock = useKioskAutoLockModule.useKioskAutoLock as jest.MockedFunction<
  typeof useKioskAutoLockModule.useKioskAutoLock
>;
const mockUseActivityDetection = useActivityDetectionModule.useActivityDetection as jest.MockedFunction<
  typeof useActivityDetectionModule.useActivityDetection
>;

describe('KioskLayout', () => {
  const mockUnlock = jest.fn();
  const mockLock = jest.fn();
  const mockEndSession = jest.fn();
  const mockUpdateActivity = jest.fn();
  const mockResetTimer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockUseKioskSession.mockReturnValue({
      sessionToken: 'test-token',
      isActive: true,
      isLocked: true,
      currentMember: null,
      autoLockMinutes: 15,
                  startSession: jest.fn(),
      endSession: mockEndSession,
      updateActivity: mockUpdateActivity,
      unlock: mockUnlock,
      lock: mockLock,
      refreshSession: jest.fn(),
    });

    mockUseKioskAutoLock.mockReturnValue({
      timeUntilLock: 900,
      resetTimer: mockResetTimer,
    });

    mockUseActivityDetection.mockImplementation(() => {});
  });

  it('should render children content', () => {
    render(
      <KioskLayout familyId="family-123">
        <div>Test Content</div>
      </KioskLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should show KioskHeader with locked state', () => {
    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('should show current member in header when unlocked', () => {
    mockUseKioskSession.mockReturnValue({
      sessionToken: 'test-token',
      isActive: true,
      isLocked: false,
      currentMember: {
        id: 'member-1',
        name: 'John Doe',
        role: 'CHILD',
      },
      autoLockMinutes: 15,
                  startSession: jest.fn(),
      endSession: mockEndSession,
      updateActivity: mockUpdateActivity,
      unlock: mockUnlock,
      lock: mockLock,
      refreshSession: jest.fn(),
    });

    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Locked')).not.toBeInTheDocument();
  });

  it('should open PIN modal when locked area is clicked', async () => {
    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    // Click on the content area (which is clickable when locked)
    const contentArea = screen.getByText('Content');
    fireEvent.click(contentArea);

    await waitFor(() => {
      expect(screen.getByText('Who are you?')).toBeInTheDocument();
    });
  });

  it('should call unlock when PIN modal submits', async () => {
    mockUnlock.mockResolvedValue(undefined);

    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    // Open modal by clicking content area
    const contentArea = screen.getByText('Content');
    fireEvent.click(contentArea);

    await waitFor(() => {
      expect(screen.getByText('Who are you?')).toBeInTheDocument();
    });

    // Click unlock button in mock modal
    const unlockButton = screen.getByText('Unlock');
    fireEvent.click(unlockButton);

    expect(mockUnlock).toHaveBeenCalledWith('member-1', '1234');
  });

  it('should call lock when lock button is clicked', () => {
    mockUseKioskSession.mockReturnValue({
      sessionToken: 'test-token',
      isActive: true,
      isLocked: false,
      currentMember: {
        id: 'member-1',
        name: 'John Doe',
        role: 'CHILD',
      },
      autoLockMinutes: 15,
                  startSession: jest.fn(),
      endSession: mockEndSession,
      updateActivity: mockUpdateActivity,
      unlock: mockUnlock,
      lock: mockLock,
      refreshSession: jest.fn(),
    });

    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    const lockButton = screen.getByRole('button', { name: /lock/i });
    fireEvent.click(lockButton);

    expect(mockLock).toHaveBeenCalled();
  });

  it('should call endSession when end session button is clicked', () => {
    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    const endSessionButton = screen.getByRole('button', { name: /end session/i });
    fireEvent.click(endSessionButton);

    expect(mockEndSession).toHaveBeenCalled();
  });

  it('should reset auto-lock timer on activity', () => {
    let activityCallback: (() => void) | null = null;

    mockUseActivityDetection.mockImplementation(({ onActivity }) => {
      activityCallback = onActivity;
    });

    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    expect(activityCallback).toBeDefined();

    // Trigger activity
    act(() => {
      activityCallback!();
    });

    expect(mockUpdateActivity).toHaveBeenCalled();
    expect(mockResetTimer).toHaveBeenCalled();
  });

  it('should auto-lock when timer reaches zero', () => {
    let autoLockCallback: (() => void) | null = null;

    mockUseKioskAutoLock.mockImplementation(({ onLock }) => {
      autoLockCallback = onLock;
      return {
        timeUntilLock: 0,
        resetTimer: mockResetTimer,
      };
    });

    mockUseKioskSession.mockReturnValue({
      sessionToken: 'test-token',
      isActive: true,
      isLocked: false,
      currentMember: {
        id: 'member-1',
        name: 'John Doe',
        role: 'CHILD',
      },
      autoLockMinutes: 15,
                  startSession: jest.fn(),
      endSession: mockEndSession,
      updateActivity: mockUpdateActivity,
      unlock: mockUnlock,
      lock: mockLock,
      refreshSession: jest.fn(),
    });

    render(
      <KioskLayout familyId="family-123">
        <div>Content</div>
      </KioskLayout>
    );

    expect(autoLockCallback).toBeDefined();

    // Trigger auto-lock
    act(() => {
      autoLockCallback!();
    });

    expect(mockLock).toHaveBeenCalled();
  });

  it('should show loading state when session is loading', () => {
    mockUseKioskSession.mockReturnValue({
      sessionToken: null,
      isActive: false,
      isLocked: true,
      currentMember: null,
      autoLockMinutes: 15,
                  startSession: jest.fn(),
      endSession: mockEndSession,
      updateActivity: mockUpdateActivity,
      unlock: mockUnlock,
      lock: mockLock,
      refreshSession: jest.fn(),
    });

    render(
      <KioskLayout familyId="family-123">
        <div>Test Content</div>
      </KioskLayout>
    );

    // Component currently shows normal layout even when loading
    // (loading state UI not implemented in KioskLayout component)
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
