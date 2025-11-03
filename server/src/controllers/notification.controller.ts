import { Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await NotificationService.getUserNotifications(userId, limit);

    res.status(200).json({
      success: true,
      data: { notifications }
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error: any) {
    if (
      error.message === 'Notification not found' ||
      error.message === 'You do not have permission to update this notification'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await NotificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    await NotificationService.deleteNotification(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Notification not found' ||
      error.message === 'You do not have permission to delete this notification'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await NotificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

