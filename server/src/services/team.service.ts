import Team, { ITeam } from '../models/Team.model';
import User from '../models/User.model';
import { NotificationService } from './notification.service';

export class TeamService {
  static async createTeam(
    name: string,
    description: string,
    ownerId: string
  ): Promise<ITeam> {
    // Check if team name already exists for this owner
    const existingTeam = await Team.findOne({ name, ownerId });
    if (existingTeam) {
      throw new Error('Team with this name already exists');
    }

    // Create team with owner as first member
    const team = new Team({
      name,
      description,
      ownerId,
      members: [
        {
          userId: ownerId,
          role: 'owner',
          joinedAt: new Date()
        }
      ]
    });

    await team.save();
    await team.populate('ownerId', 'username email avatar');
    await team.populate('members.userId', 'username email avatar');
    
    // Convert to plain object and ensure ownerId is a string for consistency
    const teamObj = team.toObject();
    if (teamObj.ownerId && typeof teamObj.ownerId === 'object' && '_id' in teamObj.ownerId) {
      teamObj.ownerId = (teamObj.ownerId as any)._id.toString();
    }
    
    return teamObj as any as ITeam;
  }

  static async getTeamById(teamId: string, userId: string): Promise<ITeam | null> {
    const team = await Team.findById(teamId)
      .populate('ownerId', 'username email avatar')
      .populate('members.userId', 'username email avatar')
      .populate('channels', 'name description type');

    if (!team) {
      return null;
    }

    // Get ownerId string (handle both populated and non-populated)
    let ownerIdStr: string;
    if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
      ownerIdStr = (team.ownerId as any)._id.toString();
    } else {
      ownerIdStr = (team.ownerId as any).toString();
    }

    // Check if user is the owner
    const isOwner = ownerIdStr === userId;

    // Check if user is a member
    const isMember = team.members.some((member: any) => {
      let memberIdStr: string;
      if (typeof member.userId === 'object' && member.userId && '_id' in member.userId) {
        memberIdStr = member.userId._id.toString();
      } else {
        memberIdStr = member.userId.toString();
      }
      return memberIdStr === userId;
    });

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // Convert to plain object and ensure ownerId is a string for consistency
    const teamObj = team.toObject();
    if (teamObj.ownerId && typeof teamObj.ownerId === 'object' && '_id' in teamObj.ownerId) {
      teamObj.ownerId = (teamObj.ownerId as any)._id.toString();
    }
    
    return teamObj as any as ITeam;
  }

  static async getUserTeams(userId: string): Promise<ITeam[]> {
    const teams = await Team.find({
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ]
    })
      .populate('ownerId', 'username email avatar')
      .populate('members.userId', 'username email avatar')
      .sort({ updatedAt: -1 });

    return teams;
  }

  static async updateTeam(
    teamId: string,
    userId: string,
    updateData: { name?: string; description?: string; avatar?: string }
  ): Promise<ITeam> {
    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user is owner or admin (team is not populated, so ownerId is ObjectId)
    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find((m) => {
      // userId in members array is ObjectId (not populated in updateTeam)
      return m.userId.toString() === userId;
    });
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to update this team');
    }

    // Update team
    if (updateData.name) team.name = updateData.name;
    if (updateData.description !== undefined) team.description = updateData.description;
    if (updateData.avatar !== undefined) team.avatar = updateData.avatar;

    await team.save();
    await team.populate('ownerId', 'username email avatar');
    await team.populate('members.userId', 'username email avatar');
    return team;
  }

  static async deleteTeam(teamId: string, userId: string): Promise<void> {
    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Only owner can delete team
    if (team.ownerId.toString() !== userId) {
      throw new Error('Only the team owner can delete this team');
    }

    await Team.findByIdAndDelete(teamId);
  }

  static async addMember(
    teamId: string,
    userId: string,
    memberEmail: string,
    role: 'admin' | 'member' = 'member'
  ): Promise<ITeam> {
    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Get ownerId string (handle both populated and non-populated)
    let ownerIdStr: string;
    if (typeof team.ownerId === 'object' && team.ownerId && '_id' in team.ownerId) {
      ownerIdStr = (team.ownerId as any)._id.toString();
    } else {
      ownerIdStr = (team.ownerId as any).toString();
    }
    
    // Check if user has permission (owner or admin)
    const isOwner = ownerIdStr === userId;
    const member = team.members.find((m: any) => {
      let memberIdStr: string;
      if (typeof m.userId === 'object' && m.userId && '_id' in m.userId) {
        memberIdStr = m.userId._id.toString();
      } else {
        memberIdStr = m.userId.toString();
      }
      return memberIdStr === userId;
    });
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to add members');
    }

    // Find user by email
    const userToAdd = await User.findOne({ email: memberEmail });
    if (!userToAdd) {
      throw new Error('User not found');
    }

    // Check if user is already a member
    const userToAddId = (userToAdd._id as any).toString();
    const isAlreadyMember = team.members.some(
      (m) => m.userId.toString() === userToAddId
    );
    if (isAlreadyMember) {
      throw new Error('User is already a member of this team');
    }

    // Add member
    team.members.push({
      userId: userToAdd._id as any,
      role,
      joinedAt: new Date()
    });

    await team.save();
    await team.populate('ownerId', 'username email avatar');
    await team.populate('members.userId', 'username email avatar');
    
    // Create notification for the newly added member
    const addedByUser = await User.findById(userId);
    const addedByName = addedByUser?.username || 'Someone';
    
    try {
      await NotificationService.createNotification(
        userToAddId,
        'team_invite',
        'Added to Team',
        `${addedByName} added you to the team "${team.name}"`,
        teamId
      );
    } catch (error) {
      console.error(`Failed to create notification for new team member ${userToAddId}:`, error);
    }
    
    return team;
  }

  static async removeMember(
    teamId: string,
    userId: string,
    memberIdToRemove: string
  ): Promise<ITeam> {
    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user has permission (owner or admin)
    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find(
      (m) => m.userId.toString() === userId
    );
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOwner && !isAdmin) {
      throw new Error('You do not have permission to remove members');
    }

    // Cannot remove owner
    if (team.ownerId.toString() === memberIdToRemove) {
      throw new Error('Cannot remove the team owner');
    }

    // Remove member
    team.members = team.members.filter(
      (m) => m.userId.toString() !== memberIdToRemove
    );

    await team.save();
    await team.populate('ownerId', 'username email avatar');
    await team.populate('members.userId', 'username email avatar');
    return team;
  }

  static async updateMemberRole(
    teamId: string,
    userId: string,
    memberId: string,
    role: 'admin' | 'member'
  ): Promise<ITeam> {
    const team = await Team.findById(teamId);

    if (!team) {
      throw new Error('Team not found');
    }

    // Only owner can update member roles (team is not populated)
    if (team.ownerId.toString() !== userId) {
      throw new Error('Only the team owner can update member roles');
    }

    // Cannot change owner role
    if (team.ownerId.toString() === memberId) {
      throw new Error('Cannot change the owner role');
    }

    // Update member role
    const member = team.members.find((m) => {
      return m.userId.toString() === memberId;
    });

    if (!member) {
      throw new Error('Member not found');
    }

    member.role = role;
    await team.save();

    await team.populate('ownerId', 'username email avatar');
    await team.populate('members.userId', 'username email avatar');
    return team;
  }
}

