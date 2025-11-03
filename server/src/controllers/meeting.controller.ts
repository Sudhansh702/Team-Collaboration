import { Response, NextFunction } from 'express';
import { MeetingService } from '../services/meeting.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const createMeeting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { title, description, teamId, startTime, endTime, participants, meetingLink } = req.body;

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
      participants || [],
      meetingLink
    );

    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: { meeting }
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
      data: { meetings }
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
      data: { meeting }
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
    const { title, description, startTime, endTime, participants, meetingLink, status } = req.body;

    const meeting = await MeetingService.updateMeeting(id, userId, {
      title,
      description,
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      participants,
      meetingLink,
      status
    });

    res.status(200).json({
      success: true,
      message: 'Meeting updated successfully',
      data: { meeting }
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
    await MeetingService.deleteMeeting(id, userId);

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

