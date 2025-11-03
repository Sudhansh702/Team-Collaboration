import apiService from './api.service';
import { AuthResponse, User } from '../types';

class AuthService {
  async register(email: string, password: string, username: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/auth/register', {
      email,
      password,
      username
    });

    if (response.success && response.data) {
      // Store tokens and user
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as AuthResponse;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/auth/login', {
      email,
      password
    });

    if (response.success && response.data) {
      // Store tokens and user
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response as AuthResponse;
  }

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>('/auth/me');
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }
    throw new Error('Failed to get current user');
  }

  async updateProfile(data: { username?: string; avatar?: string; status?: string }): Promise<User> {
    const response = await apiService.put<User>('/auth/profile', data);
    if (response.success && response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    }
    throw new Error('Failed to update profile');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getStoredUser();
  }
}

export default new AuthService();

