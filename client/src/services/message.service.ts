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

  async uploadFile(
    channelId: string,
    file: File,
    content?: string,
    onProgress?: (progress: number) => void
  ): Promise<Message> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);
    if (content) {
      formData.append('content', content);
    }

    // For multipart/form-data, we need to use XMLHttpRequest for progress tracking
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const token = localStorage.getItem('accessToken');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentCompleted = Math.round((e.loaded * 100) / e.total);
          onProgress(percentCompleted);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success && response.data) {
              resolve(response.data.message);
            } else {
              reject(new Error(response.message || 'Failed to upload file'));
            }
          } catch (error) {
            reject(new Error('Failed to parse response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Failed to upload file'));
          } catch {
            reject(new Error('Failed to upload file'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading file'));
      });

      xhr.open('POST', `${API_URL}/messages/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }
}

export default new MessageService();

