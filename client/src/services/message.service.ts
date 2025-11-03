import apiService from './api.service';
import { Message } from '../types';

class MessageService {
  async getChannelMessages(channelId: string, limit?: number, before?: string): Promise<Message[]> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    
    const response = await apiService.get<{ messages: Message[] }>(
      `/messages/channel/${channelId}${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    if (response.success && response.data) {
      return response.data.messages;
    }
    throw new Error(response.message || 'Failed to get messages');
  }

  async getMessage(messageId: string): Promise<Message> {
    const response = await apiService.get<{ message: Message }>(`/messages/${messageId}`);
    if (response.success && response.data) {
      return response.data.message;
    }
    throw new Error(response.message || 'Failed to get message');
  }

  async createMessage(
    channelId: string,
    content: string,
    type: 'text' | 'file' | 'image' | 'link' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number,
    replyTo?: string
  ): Promise<Message> {
    const response = await apiService.post<{ message: Message }>('/messages', {
      channelId,
      content,
      type,
      fileUrl,
      fileName,
      fileSize,
      replyTo
    });
    
    if (response.success && response.data) {
      return response.data.message;
    }
    throw new Error(response.message || 'Failed to create message');
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const response = await apiService.put<{ message: Message }>(`/messages/${messageId}`, {
      content
    });
    
    if (response.success && response.data) {
      return response.data.message;
    }
    throw new Error(response.message || 'Failed to update message');
  }

  async deleteMessage(messageId: string): Promise<void> {
    const response = await apiService.delete(`/messages/${messageId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete message');
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await apiService.post<{ message: Message }>(`/messages/${messageId}/reactions`, {
      emoji
    });
    
    if (response.success && response.data) {
      return response.data.message;
    }
    throw new Error(response.message || 'Failed to add reaction');
  }

  async removeReaction(messageId: string, emoji?: string): Promise<Message> {
    const response = await apiService.delete<{ message: Message }>(
      `/messages/${messageId}/reactions${emoji ? `?emoji=${emoji}` : ''}`
    );
    
    if (response.success && response.data) {
      return response.data.message;
    }
    throw new Error(response.message || 'Failed to remove reaction');
  }
}

export default new MessageService();

