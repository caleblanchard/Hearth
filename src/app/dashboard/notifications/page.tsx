'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellIcon,
  CheckIcon,
  XMarkIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationData {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filterUnread
        ? '/api/notifications?unreadOnly=true&limit=100'
        : '/api/notifications?limit=100';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterUnread]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay updated with your family's activities
              </p>
            </div>
            {notifications && notifications.unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-ember-700 hover:bg-ember-500 text-white font-medium rounded-lg transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setFilterUnread(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                !filterUnread
                  ? 'bg-ember-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <BellIcon className="h-5 w-5" />
              All
              {notifications && (
                <span className="ml-1 text-sm">({notifications.total})</span>
              )}
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                filterUnread
                  ? 'bg-ember-700 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
              Unread
              {notifications && notifications.unreadCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                  {notifications.unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ember-700"></div>
          </div>
        ) : notifications && notifications.notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-all ${
                  !notification.isRead ? 'border-l-4 border-ember-700' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {!notification.isRead && (
                        <div className="w-3 h-3 bg-ember-700 rounded-full"></div>
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        notification.type.includes('APPROVED') || notification.type.includes('EARNED')
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : notification.type.includes('REJECTED')
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-info/20 text-info dark:bg-info/30 dark:text-info'
                      }`}>
                        {notification.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {notification.message}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <BellIcon className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-xl font-medium text-gray-600 dark:text-gray-400 mb-2">
              No notifications
            </p>
            <p className="text-gray-500 dark:text-gray-500">
              {filterUnread ? "You're all caught up!" : 'New notifications will appear here'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
