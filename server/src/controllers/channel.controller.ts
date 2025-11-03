import { Response, NextFunction } from 'express';
import { ChannelService } from '../services/channel.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const createChannel = async (
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

    const { name, description, teamId, type } = req.body;

    if (!name || !teamId) {
      return res.status(400).json({
        success: false,
        message: 'Channel name and team ID are required'
      });
    }

    const channel = await ChannelService.createChannel(
      name,
      description || '',
      teamId,
      userId,
      type || 'public'
    );

    res.status(201).json({
      success: true,
      message: 'Channel created successfully',
      data: { channel }
    });
  } catch (error: any) {
    if (
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team' ||
      error.message === 'Channel with this name already exists in this team'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const getTeamChannels = async (
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
    const channels = await ChannelService.getTeamChannels(teamId, userId);

    res.json({
      success: true,
      data: { channels }
    });
  } catch (error: any) {
    if (
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

export const getChannel = async (
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
    const channel = await ChannelService.getChannelById(id, userId);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: { channel }
    });
  } catch (error: any) {
    if (
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

export const updateChannel = async (
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
    const { name, description, type } = req.body;

    const channel = await ChannelService.updateChannel(id, userId, {
      name,
      description,
      type
    });

    res.json({
      success: true,
      message: 'Channel updated successfully',
      data: { channel }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to update this channel'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const deleteChannel = async (
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
    await ChannelService.deleteChannel(id, userId);

    res.json({
      success: true,
      message: 'Channel deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to delete this channel'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const addChannelMember = async (
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
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const channel = await ChannelService.addMemberToChannel(id, userId, email);

    res.json({
      success: true,
      message: 'Member added to channel successfully',
      data: { channel }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'User not found' ||
      error.message === 'User is already a member of this channel' ||
      error.message === 'User must be a team member to join channels' ||
      error.message === 'You are not a member of this team'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const removeChannelMember = async (
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

    const { id, userId: memberIdToRemove } = req.params;

    const channel = await ChannelService.removeMemberFromChannel(
      id,
      userId,
      memberIdToRemove
    );

    res.json({
      success: true,
      message: 'Member removed from channel successfully',
      data: { channel }
    });
  } catch (error: any) {
    if (
      error.message === 'Channel not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to remove members'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

