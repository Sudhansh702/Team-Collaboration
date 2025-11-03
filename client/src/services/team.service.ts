import apiService from './api.service';
import { Team } from '../types';

class TeamService {
  async createTeam(name: string, description?: string): Promise<Team> {
    const response = await apiService.post<{ team: Team }>('/teams', {
      name,
      description
    });
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to create team');
  }

  async getTeams(): Promise<Team[]> {
    const response = await apiService.get<{ teams: Team[] }>('/teams');
    if (response.success && response.data) {
      return response.data.teams;
    }
    throw new Error(response.message || 'Failed to get teams');
  }

  async getTeamById(id: string): Promise<Team> {
    const response = await apiService.get<{ team: Team }>(`/teams/${id}`);
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to get team');
  }

  async updateTeam(id: string, data: { name?: string; description?: string; avatar?: string }): Promise<Team> {
    const response = await apiService.put<{ team: Team }>(`/teams/${id}`, data);
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to update team');
  }

  async deleteTeam(id: string): Promise<void> {
    const response = await apiService.delete(`/teams/${id}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete team');
    }
  }

  async addMember(teamId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<Team> {
    const response = await apiService.post<{ team: Team }>(`/teams/${teamId}/members`, {
      email,
      role
    });
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to add member');
  }

  async removeMember(teamId: string, userId: string): Promise<Team> {
    const response = await apiService.delete<{ team: Team }>(`/teams/${teamId}/members/${userId}`);
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to remove member');
  }

  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<Team> {
    const response = await apiService.put<{ team: Team }>(`/teams/${teamId}/members/${userId}/role`, {
      role
    });
    if (response.success && response.data) {
      return response.data.team;
    }
    throw new Error(response.message || 'Failed to update member role');
  }
}

export default new TeamService();

