import Channel, { IChannel } from '../models/Channel.model';
import Team from '../models/Team.model';
import User from '../models/User.model';
import mongoose from 'mongoose';

export class ChannelService {
  static async createChannel(
    name: string,
    description: string,
    teamId: string,
    userId: string,
    type: 'public' | 'private' = 'public'
  ): Promise<IChannel> {
    // Check if team exists and user is a member
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is a member
    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // Check if channel name already exists in team
    const existingChannel = await Channel.findOne({ name, teamId });
    if (existingChannel) {
      throw new Error('Channel with this name already exists in this team');
    }

    // Create channel
    const channel = new Channel({
      name,
      description,
      teamId,
      type,
      members: [new mongoose.Types.ObjectId(userId)]
    });

    await channel.save();

    // Add channel to team's channels array
    team.channels.push(channel._id as any);
    await team.save();

    await channel.populate('members', 'username email avatar');
    return channel;
  }

  static async getTeamChannels(
    teamId: string,
    userId: string
  ): Promise<IChannel[]> {
    // Check if user is a team member
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // Get channels - user can see public channels and private channels they're a member of
    const channels = await Channel.find({
      teamId,
      $or: [
        { type: 'public' },
        { members: userId }
      ]
    })
      .populate('members', 'username email avatar')
      .sort({ createdAt: 1 });

    return channels;
  }

  static async getChannelById(
    channelId: string,
    userId: string
  ): Promise<IChannel | null> {
    const channel = await Channel.findById(channelId)
      .populate('members', 'username email avatar')
      .populate('teamId', 'name description');

    if (!channel) {
      return null;
    }

    // Check if user has access
    const teamIdStr = typeof channel.teamId === 'string' ? channel.teamId : (channel.teamId as any)._id ? (channel.teamId as any)._id.toString() : channel.teamId.toString();
    const team = await Team.findById(teamIdStr);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // For private channels, check if user is a member
    if (channel.type === 'private') {
      const isChannelMember = channel.members.some(
        (m: any) => m._id.toString() === userId
      );
      if (!isChannelMember) {
        throw new Error('You do not have access to this private channel');
      }
    }

    return channel;
  }

  static async updateChannel(
    channelId: string,
    userId: string,
    updateData: { name?: string; description?: string; type?: 'public' | 'private' }
  ): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user is team owner or admin
    const team = await Team.findById(channel.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find(
      (m) => m.userId.toString() === userId
    );
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to update this channel');
    }

    // Update channel
    if (updateData.name) channel.name = updateData.name;
    if (updateData.description !== undefined) channel.description = updateData.description;
    if (updateData.type) channel.type = updateData.type;

    await channel.save();
    await channel.populate('members', 'username email avatar');
    return channel;
  }

  static async deleteChannel(
    channelId: string,
    userId: string
  ): Promise<void> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user is team owner or admin
    const teamIdStr = typeof channel.teamId === 'string' ? channel.teamId : channel.teamId.toString();
    const team = await Team.findById(teamIdStr);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find(
      (m) => m.userId.toString() === userId
    );
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to delete this channel');
    }

    // Remove channel from team's channels array
    team.channels = team.channels.filter(
      (id) => id.toString() !== channelId
    );
    await team.save();

    // Delete channel
    await Channel.findByIdAndDelete(channelId);
  }

  static async addMemberToChannel(
    channelId: string,
    userId: string,
    memberEmail: string
  ): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user has permission (team member)
    const teamIdStr = typeof channel.teamId === 'string' ? channel.teamId : channel.teamId.toString();
    const team = await Team.findById(teamIdStr);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isTeamMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    if (!isOwner && !isTeamMember) {
      throw new Error('You are not a member of this team');
    }

    // Find user by email
    const userToAdd = await User.findOne({ email: memberEmail });
    if (!userToAdd) {
      throw new Error('User not found');
    }

    // Check if user is a team member
    const userToAddId = (userToAdd._id as any).toString();
    const isTargetUserTeamMember = team.ownerId.toString() === userToAddId ||
      team.members.some((m) => m.userId.toString() === userToAddId);

    if (!isTargetUserTeamMember) {
      throw new Error('User must be a team member to join channels');
    }

    // Check if user is already a channel member
    const userObjectId = userToAdd._id as any;
    if (channel.members.some((id: any) => id.toString() === userToAddId)) {
      throw new Error('User is already a member of this channel');
    }

    // Add member
    channel.members.push(userObjectId);
    await channel.save();

    await channel.populate('members', 'username email avatar');
    return channel;
  }

  static async removeMemberFromChannel(
    channelId: string,
    userId: string,
    memberIdToRemove: string
  ): Promise<IChannel> {
    const channel = await Channel.findById(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if user has permission (team member)
    const teamIdStr = typeof channel.teamId === 'string' ? channel.teamId : channel.teamId.toString();
    const team = await Team.findById(teamIdStr);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isTeamMember = team.members.some(
      (m) => m.userId.toString() === userId
    );

    // User can remove themselves, or admin/owner can remove others
    const isRemovingSelf = userId === memberIdToRemove;
    const member = team.members.find((m) => m.userId.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isRemovingSelf && !isOwner && !isAdmin) {
      throw new Error('You do not have permission to remove members');
    }

    // Remove member
    channel.members = channel.members.filter(
      (id) => id.toString() !== memberIdToRemove
    );
    await channel.save();

    await channel.populate('members', 'username email avatar');
    return channel;
  }
}

