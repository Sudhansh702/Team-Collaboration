import Meeting, { IMeeting } from '../models/Meeting.model';
import Team from '../models/Team.model';
import { NotificationService } from './notification.service';
import User from '../models/User.model';

export class MeetingService {
  static async createMeeting(
    title: string,
    description: string,
    teamId: string,
    organizerId: string,
    startTime: Date,
    endTime: Date,
    participants: string[] = [],
    meetingLink?: string
  ): Promise<IMeeting> {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === organizerId;
    const isMember = team.members.some((m) => m.userId.toString() === organizerId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    // Ensure organizer is in participants
    if (!participants.includes(organizerId)) {
      participants.push(organizerId);
    }

    const meeting = new Meeting({
      title,
      description,
      teamId,
      organizerId,
      startTime,
      endTime,
      participants,
      meetingLink,
      status: 'scheduled'
    });

    await meeting.save();
    await meeting.populate('organizerId', 'username email avatar');
    await meeting.populate('participants', 'username email avatar');
    await meeting.populate('teamId', 'name');

    return meeting;
  }

  static async getTeamMeetings(teamId: string, userId: string): Promise<IMeeting[]> {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    const meetings = await Meeting.find({ teamId })
      .populate('organizerId', 'username email avatar')
      .populate('participants', 'username email avatar')
      .populate('teamId', 'name')
      .sort({ startTime: 1 });

    return meetings;
  }

  static async getMeetingById(meetingId: string, userId: string): Promise<IMeeting | null> {
    const meeting = await Meeting.findById(meetingId)
      .populate('organizerId', 'username email avatar')
      .populate('participants', 'username email avatar')
      .populate('teamId', 'name');

    if (!meeting) {
      return null;
    }

    const team = await Team.findById(meeting.teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const isOwner = team.ownerId.toString() === userId;
    const isMember = team.members.some((m) => m.userId.toString() === userId);

    if (!isOwner && !isMember) {
      throw new Error('You are not a member of this team');
    }

    return meeting;
  }

  static async updateMeeting(
    meetingId: string,
    userId: string,
    updateData: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      participants?: string[];
      meetingLink?: string;
      status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    }
  ): Promise<IMeeting> {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Only organizer or team owner/admin can update
    const isOrganizer = meeting.organizerId.toString() === userId;
    const team = await Team.findById(meeting.teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find((m) => m.userId.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOrganizer && !isOwner && !isAdmin) {
      throw new Error('You do not have permission to update this meeting');
    }

    if (updateData.title !== undefined) meeting.title = updateData.title;
    if (updateData.description !== undefined) meeting.description = updateData.description;
    if (updateData.startTime !== undefined) meeting.startTime = updateData.startTime;
    if (updateData.endTime !== undefined) meeting.endTime = updateData.endTime;
    if (updateData.participants !== undefined) {
      meeting.participants = updateData.participants.map(id => id as any);
    }
    if (updateData.meetingLink !== undefined) meeting.meetingLink = updateData.meetingLink;
    if (updateData.status !== undefined) meeting.status = updateData.status;

    await meeting.save();
    await meeting.populate('organizerId', 'username email avatar');
    await meeting.populate('participants', 'username email avatar');
    await meeting.populate('teamId', 'name');

    return meeting;
  }

  static async deleteMeeting(meetingId: string, userId: string): Promise<void> {
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const isOrganizer = meeting.organizerId.toString() === userId;
    const team = await Team.findById(meeting.teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    const isOwner = team.ownerId.toString() === userId;
    const member = team.members.find((m) => m.userId.toString() === userId);
    const isAdmin = member?.role === 'admin' || member?.role === 'owner';

    if (!isOrganizer && !isOwner && !isAdmin) {
      throw new Error('You do not have permission to delete this meeting');
    }

    await Meeting.findByIdAndDelete(meetingId);
  }
}

