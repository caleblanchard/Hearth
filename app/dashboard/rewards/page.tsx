'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ConfirmModal, AlertModal } from '@/components/ui/Modal';
import {
  GiftIcon,
  StarIcon,
  CubeIcon,
  SparklesIcon,
  TvIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';

const CATEGORIES = [
  { value: 'ALL', label: 'All', Icon: GiftIcon },
  { value: 'PRIVILEGE', label: 'Privileges', Icon: StarIcon },
  { value: 'ITEM', label: 'Items', Icon: CubeIcon },
  { value: 'EXPERIENCE', label: 'Experiences', Icon: SparklesIcon },
  { value: 'SCREEN_TIME', label: 'Screen Time', Icon: TvIcon },
  { value: 'OTHER', label: 'Other', Icon: ArchiveBoxIcon },
];

interface Reward {
  id: string;
  name: string;
  description?: string;
  category: string;
  costCredits: number;
  quantity?: number;
  imageUrl?: string;
  status: string;
  _count: {
    redemptions: number;
  };
}

export default function RewardsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [userCredits, setUserCredits] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    rewardId: string;
    rewardName: string;
    cost: number;
  }>({ isOpen: false, rewardId: '', rewardName: '', cost: 0 });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Failed to fetch rewards:', error);
    }
  };

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits?.current || 0);
      }
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    fetchUserCredits();
  }, []);

  const handleRedeemClick = (rewardId: string, rewardName: string, cost: number) => {
    setConfirmModal({
      isOpen: true,
      rewardId,
      rewardName,
      cost,
    });
  };

  const handleRedeemConfirm = async () => {
    const { rewardId, rewardName } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });
    setRedeeming(rewardId);

    try {
      const response = await fetch(`/api/rewards/${rewardId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });

      const data = await response.json();

      if (response.ok) {
        setAlertModal({
          isOpen: true,
          type: 'success',
          title: 'Success!',
          message: data.message || 'Reward redeemed successfully!',
        });
        setUserCredits(data.newBalance);
        await fetchRewards();
      } else {
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to redeem reward',
        });
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to redeem reward',
      });
    } finally {
      setRedeeming(null);
    }
  };

  const filteredRewards = filter === 'ALL'
    ? rewards
    : rewards.filter(r => r.category === filter);

  const canAfford = (cost: number) => userCredits >= cost;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Rewards Store
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Spend your credits on rewards
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Your Credits</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {userCredits}
              </p>
            </div>
          </div>
          {session?.user?.role === 'PARENT' && (
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => router.push('/dashboard/rewards/manage')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Manage Rewards
              </button>
              <button
                onClick={() => router.push('/dashboard/rewards/redemptions')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
              >
                View Redemptions
              </button>
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => {
            const CategoryIcon = cat.Icon;
            return (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                  filter === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <CategoryIcon className="h-4 w-4" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Rewards Grid */}
        {filteredRewards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => {
              const affordable = canAfford(reward.costCredits);
              const available = reward.quantity === null || reward.quantity === undefined || reward.quantity > 0;

              return (
                <div
                  key={reward.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                  {reward.imageUrl ? (
                    <img
                      src={reward.imageUrl}
                      alt={reward.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      {(() => {
                        const CategoryIcon = CATEGORIES.find(c => c.value === reward.category)?.Icon || GiftIcon;
                        return <CategoryIcon className="h-24 w-24 text-white" />;
                      })()}
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {reward.name}
                    </h3>
                    {reward.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {reward.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {reward.costCredits}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          credits
                        </span>
                      </div>
                      {reward.quantity !== null && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {reward.quantity} left
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRedeemClick(reward.id, reward.name, reward.costCredits)}
                      disabled={!affordable || !available || redeeming === reward.id}
                      className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                        !affordable
                          ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          : !available
                          ? 'bg-red-300 dark:bg-red-900 text-red-700 dark:text-red-300 cursor-not-allowed'
                          : redeeming === reward.id
                          ? 'bg-indigo-400 text-white cursor-wait'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {!affordable
                        ? `Need ${reward.costCredits - userCredits} more credits`
                        : !available
                        ? 'Out of Stock'
                        : redeeming === reward.id
                        ? 'Redeeming...'
                        : 'Redeem'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {filter === 'ALL'
                ? 'No rewards available yet.'
                : 'No rewards in this category.'}
            </p>
            {session?.user?.role === 'PARENT' && filter === 'ALL' && (
              <button
                onClick={() => router.push('/dashboard/rewards/manage')}
                className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
              >
                Create First Reward
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleRedeemConfirm}
        title="Redeem Reward"
        message={`Redeem "${confirmModal.rewardName}" for ${confirmModal.cost} credits?`}
        confirmText="Redeem"
        cancelText="Cancel"
        confirmColor="indigo"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}
