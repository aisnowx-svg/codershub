import { apiClient, ApiResponse } from './client';
import { NotificationItem } from '../types';
import { mockNotifications } from '../data/notifications';

let notificationsCache: NotificationItem[] = [...mockNotifications];

export const notificationsApi = {
  async getNotifications(): Promise<ApiResponse<NotificationItem[]>> {
    await apiClient.simulateLatency(40);
    return apiClient.wrapSuccess([...notificationsCache]);
  },

  async markAsRead(id: string): Promise<ApiResponse<boolean>> {
    await apiClient.simulateLatency(20);
    const item = notificationsCache.find((n) => n.id === id);
    if (item) {
      item.read = true;
    }
    return apiClient.wrapSuccess(true);
  },

  async markAllAsRead(): Promise<ApiResponse<boolean>> {
    await apiClient.simulateLatency(30);
    notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
    return apiClient.wrapSuccess(true, 'All notifications marked as read');
  },

  async respondToJoinRequest(
    notificationId: string,
    action: 'accept' | 'decline'
  ): Promise<ApiResponse<{ id: string; status: 'accepted' | 'declined' }>> {
    await apiClient.simulateLatency(60);
    const item = notificationsCache.find((n) => n.id === notificationId);
    if (!item || !item.joinRequestData) {
      throw new Error(`Join request notification ${notificationId} not found`);
    }

    item.joinRequestData.status = action === 'accept' ? 'accepted' : 'declined';
    item.read = true;

    return apiClient.wrapSuccess({
      id: notificationId,
      status: item.joinRequestData.status,
    });
  },
};
