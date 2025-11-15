import ChannelRead from '../models/ChannelRead.model';
import Message from '../models/Message.model';
import Channel from '../models/Channel.model';

export class ChannelReadService {
  /**
   * Mark a channel as read for a user
   */
  static async markChannelAsRead(userId: string, channelId: string): Promise<void> {
    await ChannelRead.findOneAndUpdate(
      { userId, channelId },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );
  }

  /**
   * Get unread count for a specific channel
   */
  static async getUnreadCount(userId: string, channelId: string): Promise<number> {
    const channelRead = await ChannelRead.findOne({ userId, channelId });
    const lastReadAt = channelRead?.lastReadAt || new Date(0); // If never read, count all messages

    const count = await Message.countDocuments({
      channelId,
      createdAt: { $gt: lastReadAt },
      senderId: { $ne: userId } // Don't count own messages
    });

    return count;
  }

  /**
   * Get unread counts for all channels in a team
   */
  static async getUnreadCountsForTeam(userId: string, teamId: string): Promise<Record<string, number>> {
    // Get all channels for the team
    const channels = await Channel.find({ teamId });
    const channelIds = channels.map((ch: any) => ch._id.toString());

    // Get all channel read records for this user and these channels
    const channelReads = await ChannelRead.find({
      userId,
      channelId: { $in: channelIds }
    });

    // Create a map of channelId -> lastReadAt
    const lastReadMap = new Map<string, Date>();
    channelReads.forEach(cr => {
      lastReadMap.set(cr.channelId.toString(), cr.lastReadAt);
    });

    // Get unread counts for each channel
    const unreadCounts: Record<string, number> = {};

    for (const channelId of channelIds) {
      const lastReadAt = lastReadMap.get(channelId) || new Date(0);
      
      const count = await Message.countDocuments({
        channelId,
        createdAt: { $gt: lastReadAt },
        senderId: { $ne: userId }
      });

      unreadCounts[channelId] = count;
    }

    return unreadCounts;
  }

  /**
   * Initialize channel read when user joins a channel (set to current time)
   */
  static async initializeChannelRead(userId: string, channelId: string): Promise<void> {
    await ChannelRead.findOneAndUpdate(
      { userId, channelId },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );
  }
}

