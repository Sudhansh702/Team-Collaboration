import Message from '../models/Message.model';
import Channel from '../models/Channel.model';
import Team from '../models/Team.model';
import User from '../models/User.model';

export interface SearchResult {
  messages: any[];
  channels: any[];
  teams: any[];
}

export class SearchService {
  static async search(
    userId: string,
    query: string,
    filters?: {
      type?: 'messages' | 'channels' | 'teams' | 'all';
      teamId?: string;
      channelId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<SearchResult> {
    if (!query || query.trim().length === 0) {
      return { messages: [], channels: [], teams: [] };
    }

    const searchQuery = query.trim();
    const results: SearchResult = {
      messages: [],
      channels: [],
      teams: []
    };

    // Search messages
    if (!filters || !filters.type || filters.type === 'all' || filters.type === 'messages') {
      const messageQuery: any = {
        content: { $regex: searchQuery, $options: 'i' }
      };

      // If teamId is provided, filter by team
      if (filters?.teamId) {
        const channels = await Channel.find({ teamId: filters.teamId }).select('_id');
        const channelIds = channels.map(ch => ch._id);
        messageQuery.channelId = { $in: channelIds };
      }

      // If channelId is provided, filter by channel
      if (filters?.channelId) {
        messageQuery.channelId = filters.channelId;
      }

      // Date range filter
      if (filters?.startDate || filters?.endDate) {
        messageQuery.createdAt = {};
        if (filters.startDate) {
          messageQuery.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          messageQuery.createdAt.$lte = filters.endDate;
        }
      }

      // Get user's teams to filter accessible channels
      const userTeams = await Team.find({
        $or: [
          { ownerId: userId },
          { 'members.userId': userId }
        ]
      }).select('_id');

      const teamIds = userTeams.map(t => t._id);
      const accessibleChannels = await Channel.find({
        teamId: { $in: teamIds },
        $or: [
          { type: 'public' },
          { type: 'private', members: userId }
        ]
      }).select('_id');

      const accessibleChannelIds = accessibleChannels.map(ch => ch._id);
      messageQuery.channelId = { $in: accessibleChannelIds };

      const messages = await Message.find(messageQuery)
        .populate('senderId', 'username email avatar _id')
        .populate('channelId', 'name type teamId')
        .sort({ createdAt: -1 })
        .limit(50);

      results.messages = messages.map(msg => {
        const msgObj: any = msg.toObject ? msg.toObject() : msg;
        if (msgObj._id) msgObj._id = msgObj._id.toString();
        if (msgObj.senderId && typeof msgObj.senderId === 'object' && msgObj.senderId._id) {
          msgObj.senderId._id = msgObj.senderId._id.toString();
        }
        if (msgObj.channelId && typeof msgObj.channelId === 'object' && msgObj.channelId._id) {
          msgObj.channelId._id = msgObj.channelId._id.toString();
        }
        return msgObj;
      });
    }

    // Search channels
    if (!filters || !filters.type || filters.type === 'all' || filters.type === 'channels') {
      // Get user's teams
      const userTeams = await Team.find({
        $or: [
          { ownerId: userId },
          { 'members.userId': userId }
        ]
      }).select('_id');

      const teamIds = userTeams.map(t => t._id);

      const channelQuery: any = {
        teamId: { $in: teamIds },
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      // Filter by team if provided
      if (filters?.teamId) {
        channelQuery.teamId = filters.teamId;
      }

      // Filter by channel type (public/private)
      const accessibleChannels = await Channel.find(channelQuery)
        .populate('teamId', 'name')
        .populate('members', 'username email avatar')
        .limit(20);

      // Filter out private channels user doesn't have access to
      const filteredChannels = accessibleChannels.filter(ch => {
        if (ch.type === 'public') return true;
        return ch.members.some((m: any) => {
          const memberId = typeof m === 'object' && m._id ? m._id.toString() : m.toString();
          return memberId === userId;
        });
      });

      results.channels = filteredChannels.map(ch => {
        const chObj: any = ch.toObject ? ch.toObject() : ch;
        if (chObj._id) chObj._id = chObj._id.toString();
        if (chObj.teamId && typeof chObj.teamId === 'object' && chObj.teamId._id) {
          chObj.teamId._id = chObj.teamId._id.toString();
        }
        return chObj;
      });
    }

    // Search teams
    if (!filters || !filters.type || filters.type === 'all' || filters.type === 'teams') {
      const teamQuery: any = {
        $and: [
          {
            $or: [
              { ownerId: userId },
              { 'members.userId': userId }
            ]
          },
          {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } }
            ]
          }
        ]
      };

      const teams = await Team.find(teamQuery)
        .populate('ownerId', 'username email avatar')
        .populate('members.userId', 'username email avatar')
        .limit(20);

      results.teams = teams.map(team => {
        const teamObj: any = team.toObject ? team.toObject() : team;
        if (teamObj._id) teamObj._id = teamObj._id.toString();
        if (teamObj.ownerId && typeof teamObj.ownerId === 'object' && teamObj.ownerId._id) {
          teamObj.ownerId._id = teamObj.ownerId._id.toString();
        }
        return teamObj;
      });
    }

    return results;
  }
}

