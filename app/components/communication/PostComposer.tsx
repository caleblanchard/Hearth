'use client';

import { useState } from 'react';

interface PostComposerProps {
  userRole: 'PARENT' | 'CHILD';
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PostComposer({ userRole, onSuccess, onCancel }: PostComposerProps) {
  const [type, setType] = useState<string>('NOTE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const postTypes = userRole === 'PARENT'
    ? ['ANNOUNCEMENT', 'KUDOS', 'NOTE', 'PHOTO']
    : ['KUDOS', 'NOTE', 'PHOTO'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate content
    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      setLoading(true);

      const body: any = {
        type,
        content: content.trim(),
      };

      if (title.trim()) {
        body.title = title.trim();
      }

      if (type === 'PHOTO' && imageUrl.trim()) {
        body.imageUrl = imageUrl.trim();
      }

      const response = await fetch('/api/communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      setSuccess(data.message || 'Post created successfully');

      // Clear form
      setType('NOTE');
      setTitle('');
      setContent('');
      setImageUrl('');

      // Call onSuccess callback after a brief delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Post Type */}
      <div className="mb-4">
        <label htmlFor="post-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Post Type
        </label>
        <select
          id="post-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-ember-500 focus:outline-none"
        >
          {postTypes.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="post-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Title (Optional)
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a title..."
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-ember-500 focus:outline-none"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="post-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Content *
        </label>
        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-ember-500 focus:outline-none resize-none"
        />
      </div>

      {/* Image URL (only for PHOTO type) */}
      {type === 'PHOTO' && (
        <div className="mb-4">
          <label htmlFor="image-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Image URL
          </label>
          <input
            id="image-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-ember-500 focus:outline-none"
          />
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-error/10 dark:bg-error/20 border border-error/20 text-error rounded-lg">
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-success/10 dark:bg-success/20 border border-success/20 text-success rounded-lg">
          {success}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-canvas-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
