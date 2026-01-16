import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunicationFeed from '@/app/components/communication/CommunicationFeed';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    refresh: jest.fn(),
  })),
}));

// Mock fetch
global.fetch = jest.fn();

// Create dates that are clearly in the past for "ago" formatting
const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

const mockPosts = [
  {
    id: 'post-1',
    type: 'ANNOUNCEMENT',
    title: 'Important Family Meeting',
    content: 'We will have a family meeting tonight at 7pm.',
    isPinned: true,
    createdAt: twoHoursAgo,
    author: {
      id: 'parent-1',
      name: 'Parent User',
      avatarUrl: null,
    },
    reactions: [
      {
        id: 'reaction-1',
        emoji: '👍',
        member: {
          id: 'child-1',
          name: 'Child User',
        },
      },
    ],
    _count: {
      reactions: 1,
    },
  },
  {
    id: 'post-2',
    type: 'KUDOS',
    title: null,
    content: 'Great job on your homework!',
    isPinned: false,
    createdAt: threeHoursAgo,
    author: {
      id: 'parent-1',
      name: 'Parent User',
      avatarUrl: null,
    },
    reactions: [],
    _count: {
      reactions: 0,
    },
  },
  {
    id: 'post-3',
    type: 'NOTE',
    title: null,
    content: 'Remember to take out the trash',
    isPinned: false,
    createdAt: fourHoursAgo,
    author: {
      id: 'child-1',
      name: 'Child User',
      avatarUrl: null,
    },
    reactions: [
      {
        id: 'reaction-2',
        emoji: '✅',
        member: {
          id: 'child-1',
          name: 'Child User',
        },
      },
    ],
    _count: {
      reactions: 1,
    },
  },
];

describe('CommunicationFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: mockPosts,
        pagination: {
          total: 3,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      }),
    });
  });

  it('should render loading state initially', () => {
    render(<CommunicationFeed />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display posts', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Important Family Meeting')).toBeInTheDocument();
      expect(screen.getByText('Great job on your homework!')).toBeInTheDocument();
      expect(screen.getByText('Remember to take out the trash')).toBeInTheDocument();
    });
  });

  it('should display pinned badge on pinned posts', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      const pinnedPost = screen.getByText('Important Family Meeting').closest('[data-testid="post-item"]');
      expect(within(pinnedPost as HTMLElement).getByText(/pinned/i)).toBeInTheDocument();
    });
  });

  it('should display post types with appropriate styling', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText(/announcement/i)).toBeInTheDocument();
      expect(screen.getByText(/kudos/i)).toBeInTheDocument();
      expect(screen.getByText(/note/i)).toBeInTheDocument();
    });
  });

  it('should display author information', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      const authorNames = screen.getAllByText(/Parent User|Child User/);
      expect(authorNames.length).toBeGreaterThan(0);
    });
  });

  it('should display reactions with counts', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('✅')).toBeInTheDocument();
    });
  });

  it('should allow adding a reaction', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: mockPosts,
          pagination: {
            total: 3,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: {
            ...mockPosts[1],
            reactions: [
              {
                id: 'reaction-3',
                emoji: '❤️',
                member: {
                  id: 'current-user',
                  name: 'Current User',
                },
              },
            ],
          },
        }),
      });

    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Great job on your homework!')).toBeInTheDocument();
    });

    const kudosPost = screen.getByText('Great job on your homework!').closest('[data-testid="post-item"]');
    const addReactionButton = within(kudosPost as HTMLElement).getByRole('button', { name: /add reaction/i });

    await user.click(addReactionButton);

    // Click on a reaction emoji (e.g., heart)
    const heartEmoji = await screen.findByText('❤️');
    await user.click(heartEmoji);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/communication/post-2/react'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ emoji: '❤️' }),
        })
      );
    });
  });

  it('should allow removing a reaction', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: mockPosts,
          pagination: {
            total: 3,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          post: {
            ...mockPosts[0],
            reactions: [],
          },
        }),
      });

    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Important Family Meeting')).toBeInTheDocument();
    });

    const announcementPost = screen.getByText('Important Family Meeting').closest('[data-testid="post-item"]');
    const thumbsUpReaction = within(announcementPost as HTMLElement).getByText('👍');

    await user.click(thumbsUpReaction);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/communication\/post-1\/react\?emoji=/),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('should display empty state when no posts', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [],
        pagination: {
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      }),
    });

    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
    });
  });

  it('should support filtering by post type', async () => {
    const user = userEvent.setup();
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Important Family Meeting')).toBeInTheDocument();
    });

    const filterButton = screen.getByRole('button', { name: /filter/i });
    await user.click(filterButton);

    const kudosFilter = screen.getByRole('button', { name: /kudos/i });
    await user.click(kudosFilter);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('type=KUDOS'),
        expect.any(Object)
      );
    });
  });

  it('should support filtering by pinned posts', async () => {
    const user = userEvent.setup();
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Important Family Meeting')).toBeInTheDocument();
    });

    const pinnedOnlyToggle = screen.getByRole('checkbox', { name: /pinned only/i });
    await user.click(pinnedOnlyToggle);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('pinned=true'),
        expect.any(Object)
      );
    });
  });

  it('should load more posts when scrolling', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: mockPosts,
          pagination: {
            total: 100,
            limit: 3,
            offset: 0,
            hasMore: true,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          posts: [
            {
              id: 'post-4',
              type: 'NOTE',
              content: 'Another post',
              isPinned: false,
              createdAt: '2025-01-01T09:00:00Z',
              author: { id: 'user-1', name: 'User' },
              reactions: [],
              _count: { reactions: 0 },
            },
          ],
          pagination: {
            total: 100,
            limit: 3,
            offset: 3,
            hasMore: true,
          },
        }),
      });

    const user = userEvent.setup();
    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText('Important Family Meeting')).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Another post')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to fetch posts' }),
    });

    render(<CommunicationFeed />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load posts/i)).toBeInTheDocument();
    });
  });

  it('should format timestamps correctly', async () => {
    render(<CommunicationFeed />);

    await waitFor(() => {
      // Should display relative time like "2 hours ago"
      const timestamps = screen.getAllByText(/ago/i);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });
});
