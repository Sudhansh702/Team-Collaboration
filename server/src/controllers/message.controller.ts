import { Response, NextFunction } from 'express';
import { MessageService } from '../services/message.service';
import { ChannelReadService } from '../services/channelRead.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const createMessage = async (
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

    const { channelId, content, type, fileUrl, fileName, fileSize, replyTo } = req.body;

    if (!channelId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID and content are required'
      });
    }

    const message = await MessageService.createMessage(
      channelId,
      userId,
      content,
      type || 'text',
      fileUrl,
      fileName,
      fileSize,
      replyTo
    );

    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: { message }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team' ||
      error.message === 'You do not have access to this private channel'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getChannelMessages = async (
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
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string | undefined;

    const messages = await MessageService.getChannelMessages(
      channelId,
      userId,
      limit,
      before
    );

    // Mark channel as read when user fetches messages
    await ChannelReadService.markChannelAsRead(userId, channelId);

    res.status(200).json({
      success: true,
      data: { messages }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team' ||
      error.message === 'You do not have access to this private channel'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getMessage = async (
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

    const { id } = req.params;
    const message = await MessageService.getMessageById(id, userId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { message }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const updateMessage = async (
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

    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }

    const message = await MessageService.updateMessage(id, userId, content);

    res.status(200).json({
      success: true,
      message: 'Message updated successfully',
      data: { message }
    });
  } catch (error: any) {
    if (
      error.message === 'Message not found' ||
      error.message === 'You can only edit your own messages'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const deleteMessage = async (
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

    const { id } = req.params;
    await MessageService.deleteMessage(id, userId);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Message not found' ||
      error.message === 'You do not have permission to delete this message'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const addReaction = async (
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

    const { id } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    const message = await MessageService.addReaction(id, userId, emoji);

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: { message }
    });
  } catch (error: any) {
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const removeReaction = async (
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

    const { id } = req.params;
    const { emoji } = req.body;

    const message = await MessageService.removeReaction(id, userId, emoji);

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      data: { message }
    });
  } catch (error: any) {
    if (error.message === 'Message not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

