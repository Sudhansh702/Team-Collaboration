import Message, { IMessage } from '../models/Message.model';
import Channel from '../models/Channel.model';
import Team from '../models/Team.model';
import { NotificationService } from './notification.service';
import User from '../models/User.model';

export class MessageService {
  static async createMessage(
    channelId: string,
    senderId: string,
    content: string,
    type: 'text' | 'file' | 'image' | 'link' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    replyTo?: string
  ): Promise<IMessage> {
    // Verify channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Verify user has access to channel
    const team = await Team.findById(channel.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is team member (handle populated ownerId)
    let ownerIdStr = '';
    if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
      ownerIdStr = (team.ownerId as any)._id.toString();
    } else {
      ownerIdStr = (team.ownerId as any).toString();
    }
    const isOwner = ownerIdStr === senderId;
    const isMember = team.members.some(
      (m) => m.userId.toString() === senderId
    );

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // For private channels, check if user is a channel member
    if (channel.type === 'private') {
      const isChannelMember = channel.members.some(
        (m) => m.toString() === senderId
      );
      if (!isChannelMember) {
        throw new Error('You do not have access to this private channel');
      }
    }

    // Create message
    const message = new Message({
      channelId,
      senderId,
      content,
      type,
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      replyTo: replyTo ? replyTo : undefined,
      reactions: []
    });

    await message.save();
    await message.populate('senderId', 'username email avatar _id');
    await message.populate('replyTo', 'content senderId');

    // Detect mentions (@username) and create notifications
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);
    
    if (mentions && mentions.length > 0) {
      // Get all team members
      const teamMembers = [...team.members.map(m => m.userId.toString()), ownerIdStr];
      
      // Get sender user for notification
      const senderUser = await User.findById(senderId);
      const senderName = senderUser?.username || 'Someone';
      
      for (const mention of mentions) {
        const username = mention.substring(1); // Remove @
        
        // Find user by username
        const mentionedUser = await User.findOne({ username });
        if (mentionedUser && (mentionedUser._id as any).toString() !== senderId) {
          // Check if user is a team member
          const mentionedUserId = (mentionedUser._id as any).toString();
          if (teamMembers.includes(mentionedUserId)) {
            try {
              await NotificationService.createNotification(
                mentionedUserId,
                'mention',
                'You were mentioned',
                `${senderName} mentioned you in ${channel.name}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                (message._id as any).toString()
              );
            } catch (error) {
              console.error(`Failed to create mention notification for ${mentionedUserId}:`, error);
            }
          }
        }
      }
    }

    return message;
  }

  static async getChannelMessages(
    channelId: string,
    userId: string,
    limit: number = 50,
    before?: string
  ): Promise<IMessage[]> {
    // Verify channel exists and user has access
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const team = await Team.findById(channel.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is team member (handle populated ownerId)
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
      throw new Error('You are not a member of this team');
    }

    // For private channels, check channel membership
    if (channel.type === 'private') {
      const isChannelMember = channel.members.some(
        (m) => m.toString() === userId
      );
      if (!isChannelMember) {
        throw new Error('You do not have access to this private channel');
      }
    }

    // Build query
    const query: any = { channelId };
    if (before) {
      query._id = { $lt: before };
    }

    // Fetch messages
    const messages = await Message.find(query)
      .populate('senderId', 'username email avatar _id')
      .populate('replyTo', 'content senderId')
      .sort({ createdAt: -1 })
      .limit(limit);

    // Reverse to get chronological order (oldest first)
    return messages.reverse();
  }

  static async getMessageById(
    messageId: string,
    userId: string
  ): Promise<IMessage | null> {
    const message = await Message.findById(messageId)
      .populate('senderId', 'username email avatar _id')
      .populate('replyTo', 'content senderId');

    if (!message) {
      return null;
    }

    // Verify user has access to channel
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const team = await Team.findById(channel.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is team member (handle populated ownerId)
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
      throw new Error('You are not a member of this team');
    }

    return message;
  }

  static async updateMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Only sender can update their message
    if (message.senderId.toString() !== userId) {
      throw new Error('You can only edit your own messages');
    }

    message.content = content;
    await message.save();
    await message.populate('senderId', 'username email avatar _id');
    await message.populate('replyTo', 'content senderId');

    return message;
  }

  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is sender or team admin/owner
    const channel = await Channel.findById(message.channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    const team = await Team.findById(channel.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is team member (handle populated ownerId)
    let ownerIdStr = '';
    if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
      ownerIdStr = (team.ownerId as any)._id.toString();
    } else {
      ownerIdStr = (team.ownerId as any).toString();
    }
    // Ensure both sides are strings for comparison
    const userIdStr = userId.toString();
    const isOwner = ownerIdStr === userIdStr;
    const isSender = message.senderId.toString() === userIdStr;
    const member = team.members.find((m) => m.userId.toString() === userIdStr);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    // Allow deletion if user is owner, sender, or admin
    if (!isOwner && !isSender && !isAdmin) {
      throw new Error('You do not have permission to delete this message');
    }

    await Message.findByIdAndDelete(messageId);
  }

  static async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Remove existing reaction from same user
    message.reactions = message.reactions.filter(
      (r) => r.userId.toString() !== userId
    );

    // Add new reaction
    message.reactions.push({
      userId: userId as any,
      emoji
    });

    await message.save();
    await message.populate('senderId', 'username email avatar');
    await message.populate('replyTo', 'content senderId');
    await message.populate('reactions.userId', 'username _id');

    return message;
  }

  static async removeReaction(
    messageId: string,
    userId: string,
    emoji?: string
  ): Promise<IMessage> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Remove reaction(s) from user
    if (emoji) {
      message.reactions = message.reactions.filter(
        (r) => !(r.userId.toString() === userId && r.emoji === emoji)
      );
    } else {
      message.reactions = message.reactions.filter(
        (r) => r.userId.toString() !== userId
      );
    }

    await message.save();
    await message.populate('senderId', 'username email avatar');
    await message.populate('replyTo', 'content senderId');
    await message.populate('reactions.userId', 'username _id');

    return message;
  }
}

