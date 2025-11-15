import { Response, NextFunction } from 'express';
import { ChannelReadService } from '../services/channelRead.service';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Mark a channel as read
 */
export const markChannelAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { channelId } = req.params;
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID is required'
      });
    }

    await ChannelReadService.markChannelAsRead(userId, channelId);

    res.status(200).json({
      success: true,
      message: 'Channel marked as read'
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get unread count for a specific channel
 */
export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { channelId } = req.params;
    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID is required'
      });
    }

    const count = await ChannelReadService.getUnreadCount(userId, channelId);

    res.status(200).json({
      success: true,
      data: { unreadCount: count }
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Get unread counts for all channels in a team
 */
export const getUnreadCountsForTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const { teamId } = req.params;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Team ID is required'
      });
    }

    const unreadCounts = await ChannelReadService.getUnreadCountsForTeam(userId, teamId);

    res.status(200).json({
      success: true,
      data: { unreadCounts }
    });
  } catch (error: any) {
    next(error);
  }
};

