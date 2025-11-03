import apiService from './api.service';
import { Notification } from '../types';

class NotificationService {
  async getNotifications(limit?: number): Promise<Notification[]> {
    const params = limit ? `?limit=${limit}` : '';
    const response = await apiService.get<{ notifications: Notification[] }>(`/notifications${params}`);
    if (response.success && response.data) {
      return response.data.notifications;
    }
    throw new Error(response.message || 'Failed to get notifications');
  }

  async getUnreadCount(): Promise<number> {
    const response = await apiService.get<{ count: number }>('/notifications/unread-count');
    if (response.success && response.data) {
      return response.data.count;
    }
    throw new Error(response.message || 'Failed to get unread count');
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await apiService.put<{ notification: Notification }>(
      `/notifications/${notificationId}/read`,
      {}
    );
    if (response.success && response.data) {
      return response.data.notification;
    }
    throw new Error(response.message || 'Failed to mark notification as read');
  }

  async markAllAsRead(): Promise<void> {
    const response = await apiService.put('/notifications/read-all', {});
    if (!response.success) {
      throw new Error(response.message || 'Failed to mark all as read');
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await apiService.delete(`/notifications/${notificationId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete notification');
    }
  }
}

export default new NotificationService();

