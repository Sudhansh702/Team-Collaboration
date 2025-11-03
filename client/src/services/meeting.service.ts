import apiService from './api.service';
import { Meeting } from '../types';

class MeetingService {
  async createMeeting(
    title: string,
    teamId: string,
    startTime: string,
    endTime: string,
    description?: string,
    participants: string[] = [],
    meetingLink?: string
  ): Promise<Meeting> {
    const response = await apiService.post<{ meeting: Meeting }>('/meetings', {
      title,
      description,
      teamId,
      startTime,
      endTime,
      participants,
      meetingLink
    });
    
    if (response.success && response.data) {
      return response.data.meeting;
    }
    throw new Error(response.message || 'Failed to create meeting');
  }

  async getTeamMeetings(teamId: string): Promise<Meeting[]> {
    const response = await apiService.get<{ meetings: Meeting[] }>(`/meetings/team/${teamId}`);
    if (response.success && response.data) {
      return response.data.meetings;
    }
    throw new Error(response.message || 'Failed to get meetings');
  }

  async getMeeting(meetingId: string): Promise<Meeting> {
    const response = await apiService.get<{ meeting: Meeting }>(`/meetings/${meetingId}`);
    if (response.success && response.data) {
      return response.data.meeting;
    }
    throw new Error(response.message || 'Failed to get meeting');
  }

  async updateMeeting(
    meetingId: string,
    data: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      participants?: string[];
      meetingLink?: string;
      status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
    }
  ): Promise<Meeting> {
    const response = await apiService.put<{ meeting: Meeting }>(`/meetings/${meetingId}`, data);
    if (response.success && response.data) {
      return response.data.meeting;
    }
    throw new Error(response.message || 'Failed to update meeting');
  }

  async deleteMeeting(meetingId: string): Promise<void> {
    const response = await apiService.delete(`/meetings/${meetingId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete meeting');
    }
  }
}

export default new MeetingService();

