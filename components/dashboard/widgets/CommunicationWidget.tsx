'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

interface Post {
  id: string;
  type: string;
  title: string | null;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  _count: {
    reactions: number;
  };
}

const POST_TYPE_LABELS = {
  ANNOUNCEMENT: 'Announcement',
  KUDOS: 'Kudos',
  NOTE: 'Note',
  PHOTO: 'Photo',
};

export default function CommunicationWidget() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecentPosts() {
      try {
        setLoading(true);
        setError(null);

        // Fetch recent posts (limit to 3 most recent)
        const response = await fetch('/api/communication?limit=3&offset=0');

        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        setPosts(data.data || data.posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    }

    fetchRecentPosts();

    // Poll for new posts every 30 seconds
    const pollInterval = setInterval(fetchRecentPosts, 30000);

    // Also refresh when page regains focus
    const handleFocus = () => {
      fetchRecentPosts();
    };
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Recent Messages
          </h2>
        </div>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ember-700 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
            Recent Messages
          </h2>
        </div>
        <p className="text-sm text-error">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push('/dashboard/communication')}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          Recent Messages
        </h2>
        {posts.length > 0 && (
          <span className="bg-ember-300 dark:bg-slate-900 text-ember-700 dark:text-ember-300 text-xs font-medium px-2.5 py-0.5 rounded">
            {posts.length}
          </span>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          No recent messages.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-3 bg-canvas-100 dark:bg-slate-700 rounded-lg hover:bg-canvas-200 dark:hover:bg-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {post.isPinned && (
                    <span className="text-amber-500 text-xs">📌</span>
                  )}
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                    {POST_TYPE_LABELS[post.type as keyof typeof POST_TYPE_LABELS] || post.type}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                  {getRelativeTime(post.createdAt)}
                </span>
              </div>
              {post.title && (
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  {post.title}
                </h3>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                {post.content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  by {post.author.name}
                </span>
                {post._count.reactions > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {post._count.reactions} reaction{post._count.reactions !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
          {posts.length >= 3 && (
            <p className="text-xs text-ember-700 dark:text-ember-400 text-center mt-2 font-medium">
              View all messages →
            </p>
          )}
        </div>
      )}
    </div>
  );
}
