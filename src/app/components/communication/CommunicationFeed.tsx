'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PostReaction {
  id: string;
  emoji: string;
  member: {
    id: string;
    name: string;
  };
}

interface Post {
  id: string;
  type: string;
  title: string | null;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
  reactions: PostReaction[];
  _count: {
    reactions: number;
  };
}

interface CommunicationFeedProps {
  initialFilter?: string;
  refreshTrigger?: number;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🔥'];

const POST_TYPE_COLORS = {
  ANNOUNCEMENT: 'bg-info/20 dark:bg-info/30 text-info dark:text-info',
  KUDOS: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
  NOTE: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  PHOTO: 'bg-ember-300/30 dark:bg-slate-900/30 text-ember-700 dark:text-ember-300',
};

export default function CommunicationFeed({ initialFilter, refreshTrigger }: CommunicationFeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(initialFilter || null);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const router = useRouter();

  const limit = 50;

  const fetchPosts = async (append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (pinnedOnly) params.append('pinned', 'true');
      params.append('limit', limit.toString());
      params.append('offset', (append ? offset : 0).toString());

      const response = await fetch(`/api/communication?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();

      // Handle pagination response structure: { data: Post[], pagination: {...} }
      // or legacy structure: { posts: Post[], pagination: {...} }
      const postsArray = data.data || data.posts || [];
      const pagination = data.pagination || { hasMore: false, total: 0 };

      if (append) {
        setPosts((prev) => [...(prev || []), ...(Array.isArray(postsArray) ? postsArray : [])]);
      } else {
        setPosts(Array.isArray(postsArray) ? postsArray : []);
      }

      setHasMore(pagination.hasMore || false);
      setTotal(pagination.total || 0);
      setOffset(append ? offset + limit : limit);
    } catch (err) {
      setError('Failed to load posts. Please try again.');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset offset when filters or refresh trigger changes
    setOffset(0);
    fetchPosts(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, pinnedOnly, refreshTrigger]);

  const handleReaction = async (postId: string, emoji: string, isRemoving: boolean) => {
    try {
      const url = isRemoving
        ? `/api/communication/${postId}/react?emoji=${encodeURIComponent(emoji)}`
        : `/api/communication/${postId}/react`;

      const response = await fetch(url, {
        method: isRemoving ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isRemoving ? undefined : JSON.stringify({ emoji }),
      });

      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }

      const data = await response.json();

      // Update the post in the list
      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? data.post : post))
      );

      setShowReactionPicker(null);
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  if (loading && (!posts || posts.length === 0)) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500 dark:text-gray-400">Loading posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="text-gray-500 dark:text-gray-400 mb-2">No posts yet</div>
        <div className="text-sm text-gray-400 dark:text-gray-500">
          Be the first to share something with your family!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <button
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          onClick={() => setShowReactionPicker(showReactionPicker ? null : 'filter')}
        >
          Filter
        </button>

        {showReactionPicker === 'filter' && (
          <div className="flex gap-2">
            <button
              onClick={() => setTypeFilter(null)}
              className={`px-3 py-1 rounded ${!typeFilter ? 'bg-ember-700 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              All
            </button>
            <button
              onClick={() => setTypeFilter('ANNOUNCEMENT')}
              className={`px-3 py-1 rounded ${typeFilter === 'ANNOUNCEMENT' ? 'bg-ember-700 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              Announcements
            </button>
            <button
              onClick={() => setTypeFilter('KUDOS')}
              className={`px-3 py-1 rounded ${typeFilter === 'KUDOS' ? 'bg-ember-700 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              Kudos
            </button>
            <button
              onClick={() => setTypeFilter('NOTE')}
              className={`px-3 py-1 rounded ${typeFilter === 'NOTE' ? 'bg-ember-700 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              Notes
            </button>
            <button
              onClick={() => setTypeFilter('PHOTO')}
              className={`px-3 py-1 rounded ${typeFilter === 'PHOTO' ? 'bg-ember-700 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              Photos
            </button>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={pinnedOnly}
            onChange={(e) => setPinnedOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pinned only</span>
        </label>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {(posts || []).map((post) => (
          <div
            key={post.id}
            data-testid="post-item"
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  {post.author?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {post.author?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTimestamp(post.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${POST_TYPE_COLORS[post.type as keyof typeof POST_TYPE_COLORS]}`}>
                  {post.type}
                </span>
                {post.isPinned && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                    Pinned
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            {post.title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {post.title}
              </h3>
            )}
            <p className="text-gray-700 dark:text-gray-300 mb-4">{post.content}</p>

            {post.imageUrl && (
              <img
                src={post.imageUrl}
                alt={post.title || 'Post image'}
                className="rounded-lg mb-4 max-w-full h-auto"
              />
            )}

            {/* Reactions */}
            <div className="flex items-center gap-2 flex-wrap">
              {post.reactions.map((reaction) => (
                <button
                  key={reaction.id}
                  onClick={() => handleReaction(post.id, reaction.emoji, true)}
                  className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                  title={reaction.member.name}
                >
                  {reaction.emoji}
                </button>
              ))}

              <button
                onClick={() =>
                  setShowReactionPicker(
                    showReactionPicker === post.id ? null : post.id
                  )
                }
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                aria-label="Add reaction"
              >
                + Add Reaction
              </button>

              {showReactionPicker === post.id && (
                <div className="flex gap-1 ml-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(post.id, emoji, false)}
                      className="text-2xl hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center p-4">
          <button
            onClick={() => fetchPosts(true)}
            disabled={loading}
            className="px-6 py-2 bg-ember-700 text-white rounded-lg hover:bg-ember-500 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
