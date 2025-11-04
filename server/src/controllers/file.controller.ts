import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { upload, getFileUrl, getMessageTypeFromFile } from '../middleware/upload.middleware';
import { MessageService } from '../services/message.service';
import Channel from '../models/Channel.model';
import Team from '../models/Team.model';
import { io } from '../index';

// Upload file and create message
export const uploadFileAndCreateMessage = async (
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

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { channelId, content } = req.body;

    if (!channelId) {
      return res.status(400).json({
        success: false,
        message: 'Channel ID is required'
      });
    }

    // Verify channel exists and user has access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    const team = await Team.findById(channel.teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user is team member
    let ownerIdStr = '';
    if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
      ownerIdStr = (team.ownerId as any)._id.toString();
    } else {
      ownerIdStr = (team.ownerId as any).toString();
    }
    const isOwner = ownerIdStr === userId;
    const isMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this team'
      });
    }

    // For private channels, check if user is a channel member
    if (channel.type === 'private') {
      const isChannelMember = channel.members.some(
        (m) => m.toString() === userId
      );
      if (!isChannelMember) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this private channel'
        });
      }
    }

    // Get file URL and determine message type
    // Store the filename in fileUrl for easier reconstruction
    const fileUrl = getFileUrl(req.file.filename);
    const messageType = getMessageTypeFromFile(req.file.mimetype);
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    
    console.log('File upload:', {
      filename: req.file.filename,
      originalname: fileName,
      fileUrl: fileUrl,
      size: fileSize,
      type: messageType
    });

    // Create message with file
    const message = await MessageService.createMessage(
      channelId,
      userId,
      content || `Shared file: ${fileName}`,
      messageType,
      fileUrl,
      fileName,
      fileSize
    );

    // Convert to plain object
    const messageObj: any = message.toObject ? message.toObject() : message;
    if (messageObj.senderId && typeof messageObj.senderId === 'object' && messageObj.senderId._id) {
      messageObj.senderId._id = messageObj.senderId._id.toString();
    }
    if (messageObj._id) {
      messageObj._id = messageObj._id.toString();
    }

    // Broadcast message to all users in the channel via Socket.io
    try {
      io.to(`channel:${channelId}`).emit('new-message', messageObj);
    } catch (socketError) {
      console.error('Error broadcasting message via socket:', socketError);
      // Continue even if socket broadcast fails
    }

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { message: messageObj }
    });
  } catch (error: any) {
    next(error);
  }
};

// Download file
export const downloadFile = async (
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

    const { filename } = req.params;
    const path = require('path');
    const fs = require('fs');
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Send file
    res.download(filePath, (err) => {
      if (err) {
        next(err);
      }
    });
  } catch (error) {
    next(error);
  }
};

