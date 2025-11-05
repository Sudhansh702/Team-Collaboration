import { Response, NextFunction } from 'express';
import { MeetingService } from '../services/meeting.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { IMeeting } from '../models/Meeting.model';
import { io } from '../index';

// Helper function to transform meeting for frontend (convert populated objects to string IDs)
const transformMeeting = (meeting: IMeeting | any): any => {
  const meetingObj = meeting.toObject ? meeting.toObject() : meeting;
  
  return {
    ...meetingObj,
    _id: meetingObj._id?.toString() || meetingObj._id,
    teamId: meetingObj.teamId?._id?.toString() || meetingObj.teamId?.toString() || meetingObj.teamId,
    organizerId: meetingObj.organizerId?._id?.toString() || meetingObj.organizerId?.toString() || meetingObj.organizerId,
    participants: Array.isArray(meetingObj.participants)
      ? meetingObj.participants.map((item: any) => 
          item._id?.toString() || item.toString() || item
        )
      : [],
    startTime: meetingObj.startTime ? (meetingObj.startTime instanceof Date ? meetingObj.startTime.toISOString() : meetingObj.startTime) : undefined,
    endTime: meetingObj.endTime ? (meetingObj.endTime instanceof Date ? meetingObj.endTime.toISOString() : meetingObj.endTime) : undefined,
    createdAt: meetingObj.createdAt?.toISOString() || meetingObj.createdAt,
    updatedAt: meetingObj.updatedAt?.toISOString() || meetingObj.updatedAt,
  };
};

export const createMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, description, teamId, startTime, endTime, participants } = req.body;

    if (!title || !teamId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Title, team ID, start time, and end time are required'
      });
    }

    const meeting = await MeetingService.createMeeting(
      title,
      description || '',
      teamId,
      userId,
      new Date(startTime),
      new Date(endTime),
      participants || []
    );

    const transformedMeeting = transformMeeting(meeting);
    
    // Emit real-time event to team room
    io.to(`team:${teamId}`).emit('meeting-created', transformedMeeting);
    
    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: { meeting: transformedMeeting }
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

export const getTeamMeetings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { teamId } = req.params;
    const meetings = await MeetingService.getTeamMeetings(teamId, userId);

    res.status(200).json({
      success: true,
      data: { meetings: meetings.map(transformMeeting) }
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

export const getMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const meeting = await MeetingService.getMeetingById(id, userId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { meeting: transformMeeting(meeting) }
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

export const updateMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { title, description, startTime, endTime, participants, status } = req.body;

    const meeting = await MeetingService.updateMeeting(id, userId, {
      title,
      description,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      participants,
      status
    });

    const transformedMeeting = transformMeeting(meeting);
    
    // Emit real-time event to team room
    io.to(`team:${transformedMeeting.teamId}`).emit('meeting-updated', transformedMeeting);
    
    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: { meeting: transformedMeeting }
    });
  } catch (error: any) {
    if (
      error.message === 'Meeting not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to update this meeting'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const meeting = await MeetingService.getMeetingById(id, userId);
    
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    const teamId = typeof meeting.teamId === 'object' && meeting.teamId && '_id' in meeting.teamId
      ? (meeting.teamId as any)._id.toString()
      : String(meeting.teamId);
    
    await MeetingService.deleteMeeting(id, userId);

    // Emit real-time event to team room
    io.to(`team:${teamId}`).emit('meeting-deleted', { meetingId: id });

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error: any) {
    if (
      error.message === 'Meeting not found' ||
      error.message === 'Team not found' ||
      error.message === 'You do not have permission to delete this meeting'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const startMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const meeting = await MeetingService.startMeeting(id, userId);

    const transformedMeeting = transformMeeting(meeting);
    
    // Emit real-time event to team room
    io.to(`team:${transformedMeeting.teamId}`).emit('meeting-updated', transformedMeeting);
    
    res.status(200).json({
      success: true,
      message: 'Meeting started successfully',
      data: { meeting: transformedMeeting }
    });
  } catch (error: any) {
    if (
      error.message === 'Meeting not found' ||
      error.message === 'Team not found' ||
      error.message === 'You are not a member of this team' ||
      error.message === 'Meeting cannot have more than 10 participants'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const joinMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const meeting = await MeetingService.joinMeeting(id, userId);

    const transformedMeeting = transformMeeting(meeting);
    
    res.status(200).json({
      success: true,
      message: 'Joined meeting successfully',
      data: { meeting: transformedMeeting }
    });
  } catch (error: any) {
    if (
      error.message === 'Meeting not found' ||
      error.message === 'Team not found' ||
      error.message === 'You are not authorized to join this meeting' ||
      error.message === 'Meeting is not active. Only active meetings can be joined.'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export const leaveMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { id } = req.params;
    const meeting = await MeetingService.leaveMeeting(id, userId);

    const transformedMeeting = transformMeeting(meeting);
    
    // Emit real-time event to team room if meeting was completed
    if (transformedMeeting.status === 'completed') {
      io.to(`team:${transformedMeeting.teamId}`).emit('meeting-updated', transformedMeeting);
    }
    
    res.status(200).json({
      success: true,
      message: 'Left meeting successfully',
      data: { meeting: transformedMeeting }
    });
  } catch (error: any) {
    if (
      error.message === 'Meeting not found' ||
      error.message === 'Team not found'
    ) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

