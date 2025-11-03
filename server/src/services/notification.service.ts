import Notification, { INotification } from '../models/Notification.model';
import User from '../models/User.model';

export class NotificationService {
  static async createNotification(
    userId: string,
    type: 'message' | 'task' | 'meeting' | 'team_invite' | 'mention',
    title: string,
    message: string,
    relatedId?: string
  ): Promise<INotification> {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedId,
      read: false
    });

    await notification.save();
    await notification.populate('userId', 'username email');

    return notification;
  }

  static async getUserNotifications(userId: string, limit: number = 50): Promise<INotification[]> {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return notifications;
  }

  static async markAsRead(notificationId: string, userId: string): Promise<INotification> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId.toString() !== userId) {
      throw new Error('You do not have permission to update this notification');
    }

    notification.read = true;
    await notification.save();

    return notification;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany({ userId, read: false }, { read: true });
  }

  static async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    if (notification.userId.toString() !== userId) {
      throw new Error('You do not have permission to delete this notification');
    }

    await Notification.findByIdAndDelete(notificationId);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return await Notification.countDocuments({ userId, read: false });
  }
}

