import { useState, useEffect, useCallback } from 'react';
import { NotificationItem } from '../types';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuthStore();

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const list = await notificationService.getNotifications(currentUser.id);
      setNotifications(list);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    await notificationService.markAsRead(id);
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await notificationService.markAllAsRead(currentUser.id);
  };

  const respondToJoinRequest = async (id: string, action: 'accept' | 'decline') => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && n.joinRequestData) {
          return {
            ...n,
            read: true,
            joinRequestData: {
              ...n.joinRequestData,
              status: action === 'accept' ? 'accepted' : 'declined',
            },
          };
        }
        return n;
      })
    );
    await notificationService.respondToJoinRequest(id, action);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    respondToJoinRequest,
  };
}
