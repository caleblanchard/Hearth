'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import CommunicationFeed from '@/app/components/communication/CommunicationFeed';
import PostComposer from '@/app/components/communication/PostComposer';
import { Modal } from '@/components/ui/Modal';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function CommunicationPage() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handlePostSuccess = () => {
    setIsModalOpen(false);
    // Trigger refresh of the feed
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const userRole = session?.user?.role === 'PARENT' ? 'PARENT' : 'CHILD';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Communication Board
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Share messages, announcements, and updates with your family
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          New Message
        </button>
      </div>

      <div className="space-y-6">
        <CommunicationFeed refreshTrigger={refreshKey} />
      </div>

      {/* Post Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Post"
        size="lg"
      >
        <PostComposer
          userRole={userRole}
          onSuccess={handlePostSuccess}
          onCancel={handleCancel}
        />
      </Modal>
    </div>
  );
}
