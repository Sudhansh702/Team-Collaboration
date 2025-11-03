import apiService from './api.service';
import { Channel } from '../types';

class ChannelService {
  async createChannel(name: string, teamId: string, description?: string, type: 'public' | 'private' = 'public'): Promise<Channel> {
    const response = await apiService.post<{ channel: Channel }>('/channels', {
      name,
      teamId,
      description,
      type
    });
    if (response.success && response.data) {
      return response.data.channel;
    }
    throw new Error(response.message || 'Failed to create channel');
  }

  async getTeamChannels(teamId: string): Promise<Channel[]> {
    const response = await apiService.get<{ channels: Channel[] }>(`/channels/team/${teamId}`);
    if (response.success && response.data) {
      return response.data.channels;
    }
    throw new Error(response.message || 'Failed to get channels');
  }

  async getChannelById(id: string): Promise<Channel> {
    const response = await apiService.get<{ channel: Channel }>(`/channels/${id}`);
    if (response.success && response.data) {
      return response.data.channel;
    }
    throw new Error(response.message || 'Failed to get channel');
  }

  async updateChannel(id: string, data: { name?: string; description?: string; type?: 'public' | 'private' }): Promise<Channel> {
    const response = await apiService.put<{ channel: Channel }>(`/channels/${id}`, data);
    if (response.success && response.data) {
      return response.data.channel;
    }
    throw new Error(response.message || 'Failed to update channel');
  }

  async deleteChannel(id: string): Promise<void> {
    const response = await apiService.delete(`/channels/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete channel');
    }
  }

  async addMember(channelId: string, email: string): Promise<Channel> {
    const response = await apiService.post<{ channel: Channel }>(`/channels/${channelId}/members`, {
      email
    });
    if (response.success && response.data) {
      return response.data.channel;
    }
    throw new Error(response.message || 'Failed to add member');
  }

  async removeMember(channelId: string, userId: string): Promise<Channel> {
    const response = await apiService.delete<{ channel: Channel }>(`/channels/${channelId}/members/${userId}`);
    if (response.success && response.data) {
      return response.data.channel;
    }
    throw new Error(response.message || 'Failed to remove member');
  }
}

export default new ChannelService();

