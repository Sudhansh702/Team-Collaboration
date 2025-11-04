import apiService from './api.service';
import { Message, Channel, Team } from '../types';

export interface SearchFilters {
  type?: 'messages' | 'channels' | 'teams' | 'all';
  teamId?: string;
  channelId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SearchResults {
  messages: Message[];
  channels: Channel[];
  teams: Team[];
}

class SearchService {
  async search(query: string, filters?: SearchFilters): Promise<SearchResults> {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.teamId) {
      params.append('teamId', filters.teamId);
    }
    if (filters?.channelId) {
      params.append('channelId', filters.channelId);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await apiService.get<SearchResults>(
      `/search?${params.toString()}`
    );

    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to search');
  }
}

export default new SearchService();


