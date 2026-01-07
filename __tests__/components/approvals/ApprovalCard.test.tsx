import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApprovalCard } from '@/components/approvals/ApprovalCard';
import { ApprovalItem } from '@/types/approvals';

// Mock fetch for approve/deny actions
global.fetch = jest.fn();

describe('ApprovalCard', () => {
  const mockChoreApproval: ApprovalItem = {
    id: 'chore-123',
    type: 'CHORE_COMPLETION',
    familyMemberId: 'child-1',
    familyMemberName: 'John Doe',
    familyMemberAvatarUrl: undefined,
    title: 'Clean Room',
    description: 'Clean your bedroom',
    requestedAt: new Date('2024-01-06T10:00:00Z'),
    priority: 'HIGH',
    metadata: {
      photoUrl: 'https://example.com/photo.jpg',
      credits: 50
    }
  };

  const mockRewardApproval: ApprovalItem = {
    id: 'reward-456',
    type: 'REWARD_REDEMPTION',
    familyMemberId: 'child-2',
    familyMemberName: 'Jane Smith',
    familyMemberAvatarUrl: 'https://example.com/avatar.jpg',
    title: 'Ice Cream Trip',
    description: 'Trip to ice cream shop',
    requestedAt: new Date('2024-01-06T14:00:00Z'),
    priority: 'NORMAL',
    metadata: {
      costCredits: 75
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  describe('Rendering', () => {
    it('should render chore approval with all details', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.getByText('Clean Room')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/chore completion/i)).toBeInTheDocument();
      expect(screen.getByText(/50.*credits/i)).toBeInTheDocument();
    });

    it('should render reward approval with all details', () => {
      render(
        <ApprovalCard
          approval={mockRewardApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.getByText('Ice Cream Trip')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText(/reward redemption/i)).toBeInTheDocument();
      expect(screen.getByText(/75.*credits/i)).toBeInTheDocument();
    });

    it('should show HIGH priority badge', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const badge = screen.getByText('HIGH');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100'); // or similar high priority styling
    });

    it('should show NORMAL priority badge', () => {
      render(
        <ApprovalCard
          approval={mockRewardApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const badge = screen.getByText('NORMAL');
      expect(badge).toBeInTheDocument();
    });

    it('should display photo preview for chores with photos', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const photo = screen.getByRole('img', { name: /chore photo/i });
      expect(photo).toBeInTheDocument();
      // Next.js Image optimizes the src, so we check it contains the photo URL
      expect(photo.getAttribute('src')).toContain('photo.jpg');
    });

    it('should not display photo for chores without photos', () => {
      const choreWithoutPhoto = {
        ...mockChoreApproval,
        metadata: { credits: 50 }
      };

      render(
        <ApprovalCard
          approval={choreWithoutPhoto}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.queryByRole('img', { name: /chore photo/i })).not.toBeInTheDocument();
    });

    it('should display avatar when provided', () => {
      render(
        <ApprovalCard
          approval={mockRewardApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const avatar = screen.getByRole('img', { name: /jane smith/i });
      // Next.js Image optimizes the src, so we check it contains the avatar URL
      expect(avatar.getAttribute('src')).toContain('avatar.jpg');
    });

    it('should display initials when no avatar provided', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe initials
    });
  });

  describe('Actions', () => {
    it('should call onApprove when approve button is clicked', async () => {
      const onApprove = jest.fn();
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={onApprove}
          onDeny={jest.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalledWith('chore-123');
      });
    });

    it('should call onDeny when deny button is clicked', async () => {
      const onDeny = jest.fn();
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={onDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /deny/i });
      fireEvent.click(denyButton);

      await waitFor(() => {
        expect(onDeny).toHaveBeenCalledWith('chore-123');
      });
    });

    it('should disable buttons while processing', async () => {
      const onApprove = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={onApprove}
          onDeny={jest.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const denyButton = screen.getByRole('button', { name: /deny/i });

      fireEvent.click(approveButton);

      // Buttons should be disabled while processing
      expect(approveButton).toBeDisabled();
      expect(denyButton).toBeDisabled();
    });

    it('should show loading state on approve button when processing', async () => {
      const onApprove = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={onApprove}
          onDeny={jest.fn()}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText(/approving/i)).toBeInTheDocument();
      });
    });
  });

  describe('Expandable Details', () => {
    it('should expand details when clicking expand button', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      // Details should be hidden initially
      expect(screen.queryByText(/requested at/i)).not.toBeInTheDocument();

      const expandButton = screen.getByRole('button', { name: /details|expand/i });
      fireEvent.click(expandButton);

      // Details should now be visible
      expect(screen.getByText(/requested at/i)).toBeInTheDocument();
    });

    it('should collapse details when clicking expand button again', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const expandButton = screen.getByRole('button', { name: /details|expand/i });
      
      // Expand
      fireEvent.click(expandButton);
      expect(screen.getByText(/requested at/i)).toBeInTheDocument();

      // Collapse
      fireEvent.click(expandButton);
      expect(screen.queryByText(/requested at/i)).not.toBeInTheDocument();
    });

    it('should display formatted timestamp in details', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      const expandButton = screen.getByRole('button', { name: /details|expand/i });
      fireEvent.click(expandButton);

      // Should show formatted date/time
      expect(screen.getByText(/jan.*6.*2024/i)).toBeInTheDocument();
    });
  });

  describe('Bulk Selection', () => {
    it('should show checkbox when onSelect is provided', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
          onSelect={jest.fn()}
          isSelected={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should not show checkbox when onSelect is not provided', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should show checked state when isSelected is true', () => {
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
          onSelect={jest.fn()}
          isSelected={true}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should call onSelect when checkbox is clicked', () => {
      const onSelect = jest.fn();
      render(
        <ApprovalCard
          approval={mockChoreApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
          onSelect={onSelect}
          isSelected={false}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(onSelect).toHaveBeenCalledWith('chore-123', true);
    });
  });

  describe('Time Display', () => {
    it('should show relative time for recent requests', () => {
      const recentApproval = {
        ...mockChoreApproval,
        requestedAt: new Date(Date.now() - 30000) // 30 seconds ago
      };

      render(
        <ApprovalCard
          approval={recentApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      // date-fns formatDistanceToNow returns "less than a minute ago" or similar
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });

    it('should show relative time for older requests', () => {
      const oldApproval = {
        ...mockChoreApproval,
        requestedAt: new Date(Date.now() - 7200000) // 2 hours ago
      };

      render(
        <ApprovalCard
          approval={oldApproval}
          onApprove={jest.fn()}
          onDeny={jest.fn()}
        />
      );

      expect(screen.getByText(/2 hours ago/i)).toBeInTheDocument();
    });
  });
});
