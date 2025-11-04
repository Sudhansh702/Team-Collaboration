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
      // Verify we have the required tokens
      if (!response.data.accessToken || !response.data.refreshToken || !response.data.user) {
        console.error('Register response missing required fields:', response.data);
        throw new Error('Invalid registration response');
      }

      // Store tokens and user
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // Ensure user data has all required fields
      const userData: User = {
        _id: response.data.user._id || '',
        email: response.data.user.email || '',
        username: response.data.user.username || '',
        avatar: response.data.user.avatar || '',
        status: response.data.user.status || 'offline',
        createdAt: response.data.user.createdAt || new Date().toISOString(),
        updatedAt: response.data.user.updatedAt || new Date().toISOString()
      };
      
      // Validate user data before storing
      if (!userData._id || !userData.email) {
        console.error('Invalid user data from register - cannot store:', userData);
        throw new Error('Invalid user data - missing required fields');
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Verify storage worked
      const storedToken = localStorage.getItem('accessToken');
      const storedRefresh = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedRefresh || !storedUser) {
        console.error('Failed to store authentication data in localStorage');
        console.error('accessToken stored:', !!storedToken);
        console.error('refreshToken stored:', !!storedRefresh);
        console.error('user stored:', !!storedUser);
        throw new Error('Failed to store authentication data');
      }
      
      // Verify user data is valid JSON and not empty
      try {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser._id || !parsedUser.email) {
          console.error('User data stored but invalid:', parsedUser);
          throw new Error('Stored user data is invalid');
        }
      } catch (parseError) {
        console.error('Stored user data is not valid JSON:', parseError);
        throw new Error('Failed to validate stored user data');
      }
      
      console.log('Authentication data stored successfully');
    }

    return response as AuthResponse;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse['data']>('/auth/login', {
      email,
      password
    });

    if (response.success && response.data) {
      // Verify we have the required tokens
      if (!response.data.accessToken || !response.data.refreshToken || !response.data.user) {
        console.error('Login response missing required fields:', response.data);
        throw new Error('Invalid login response');
      }

      // Store tokens and user
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      // Ensure user data has all required fields
      const userData: User = {
        _id: response.data.user._id || '',
        email: response.data.user.email || '',
        username: response.data.user.username || '',
        avatar: response.data.user.avatar || '',
        status: response.data.user.status || 'offline',
        createdAt: response.data.user.createdAt || new Date().toISOString(),
        updatedAt: response.data.user.updatedAt || new Date().toISOString()
      };
      
      // Validate user data before storing
      if (!userData._id || !userData.email) {
        console.error('Invalid user data from login - cannot store:', userData);
        throw new Error('Invalid user data - missing required fields');
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Verify storage worked
      const storedToken = localStorage.getItem('accessToken');
      const storedRefresh = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedRefresh || !storedUser) {
        console.error('Failed to store authentication data in localStorage');
        console.error('accessToken stored:', !!storedToken);
        console.error('refreshToken stored:', !!storedRefresh);
        console.error('user stored:', !!storedUser);
        throw new Error('Failed to store authentication data');
      }
      
      // Verify user data is valid JSON and not empty
      try {
        const parsedUser = JSON.parse(storedUser);
        if (!parsedUser._id || !parsedUser.email) {
          console.error('User data stored but invalid:', parsedUser);
          throw new Error('Stored user data is invalid');
        }
      } catch (parseError) {
        console.error('Stored user data is not valid JSON:', parseError);
        throw new Error('Failed to validate stored user data');
      }
      
      console.log('Authentication data stored successfully');
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
    try {
      const response = await apiService.get<{ user: User }>('/auth/me');
      if (response.success && response.data) {
        // The backend returns { success: true, data: { user: userObj } }
        const userObj = response.data.user || response.data;
        
        // Validate user data before storing
        if (!userObj._id || !userObj.email) {
          console.error('Invalid user data received from API:', userObj);
          throw new Error('Invalid user data received');
        }

        // Ensure all required fields are present
        const userData: User = {
          _id: userObj._id || '',
          email: userObj.email || '',
          username: userObj.username || '',
          avatar: userObj.avatar || '',
          status: userObj.status || 'offline',
          createdAt: userObj.createdAt || new Date().toISOString(),
          updatedAt: userObj.updatedAt || new Date().toISOString()
        };
        
        // Always store user data after successful fetch - prevents data loss
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Verify it was stored correctly
        const verifyStored = localStorage.getItem('user');
        if (!verifyStored || verifyStored === 'null' || verifyStored === '{}') {
          console.error('Failed to persist user data to localStorage');
          throw new Error('Failed to store user data');
        }
        
        return userData;
      }
      throw new Error('Failed to get current user');
    } catch (error: any) {
      // Re-throw with original error for status checking
      throw error;
    }
  }

  async updateProfile(data: { username?: string; avatar?: string; status?: string }): Promise<User> {
    // Ensure we're sending valid data
    const updatePayload: { username?: string; avatar?: string; status?: string } = {};
    
    // Always include username if provided (required field)
    if (data.username !== undefined && data.username !== null) {
      const trimmedUsername = String(data.username).trim();
      if (trimmedUsername) {
        updatePayload.username = trimmedUsername;
      }
    }
    
    // Avatar can be empty string - explicitly allow it
    // Always include avatar if it exists as a key in the data object (even if empty string)
    // This ensures avatar updates work correctly
    if ('avatar' in data) {
      // Include avatar even if it's null, undefined, or empty string
      // This allows clearing avatar and updating avatar
      const avatarValue = data.avatar !== null && data.avatar !== undefined 
        ? String(data.avatar).trim() 
        : '';
      updatePayload.avatar = avatarValue;
      console.log('Avatar included in payload:', avatarValue || 'empty string', 'length:', avatarValue.length);
    } else {
      console.log('Avatar not included in data object');
    }
    
    // Status must be valid
    if (data.status !== undefined && data.status !== null) {
      updatePayload.status = String(data.status).toLowerCase();
    }
    
    console.log('Updating profile with payload:', {
      username: updatePayload.username !== undefined ? (updatePayload.username ? `${updatePayload.username.substring(0, 10)}...` : 'empty') : 'not provided',
      avatar: updatePayload.avatar !== undefined ? (updatePayload.avatar ? `${updatePayload.avatar.substring(0, 30)}...` : 'empty string') : 'not provided',
      avatarKeyExists: 'avatar' in updatePayload,
      status: updatePayload.status || 'not provided'
    });
    
    const response = await apiService.put<{ user: User }>('/auth/profile', updatePayload);
    if (response.success && response.data) {
      // The backend returns { success: true, data: { user: userObj } }
      const userObj = response.data.user || response.data;
      // Ensure all required fields are present
      const userData: User = {
        _id: userObj._id || '',
        email: userObj.email || '',
        username: userObj.username || '',
        avatar: userObj.avatar || '',
        status: userObj.status || 'offline',
        createdAt: userObj.createdAt || new Date().toISOString(),
        updatedAt: userObj.updatedAt || new Date().toISOString()
      };
      // Validate user data before storing
      if (!userData._id || !userData.email) {
        console.error('Invalid user data from update - cannot store:', userData);
        throw new Error('Invalid user data - missing required fields');
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Verify storage
      const verifyStored = localStorage.getItem('user');
      if (!verifyStored || verifyStored === 'null' || verifyStored === '{}') {
        console.error('Failed to persist updated user data');
        throw new Error('Failed to store updated user data');
      }
      
      return userData;
    }
    throw new Error('Failed to update profile');
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('Parsed user from localStorage:', user);
        
        // If user object exists but is empty or missing fields, try to recover from tokens
        if (!user || (!user._id && !user.email)) {
          console.warn('User data is empty or invalid, attempting to recover...');
          // Don't clear it - maybe it's just malformed and we can recover
          // Return null but don't delete the storage
          return null;
        }
        
        // Ensure all required fields are present
        if (user && user._id && user.email) {
          const userData: User = {
            _id: user._id || '',
            email: user.email || '',
            username: user.username || '',
            avatar: user.avatar || '',
            status: user.status || 'offline',
            createdAt: user.createdAt || new Date().toISOString(),
            updatedAt: user.updatedAt || new Date().toISOString()
          };
          console.log('Returning user data:', userData);
          return userData;
        } else {
          console.error('User data missing required fields:', {
            hasId: !!user?._id,
            hasEmail: !!user?.email,
            userObject: user
          });
          // Don't clear - preserve what we have
          return null;
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        console.error('User string:', userStr);
        // Don't clear on parse error - might be recoverable
        return null;
      }
    }
    return null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  async refreshTokenIfNeeded(): Promise<void> {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    
    if (!accessToken || !refreshToken) {
      return;
    }

    try {
      // Decode the JWT to check expiration (without verification for now)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // Refresh if token expires in less than 5 minutes (300000 ms)
      if (timeUntilExpiry < 300000 && timeUntilExpiry > 0) {
        await this.refreshAccessToken();
      }
    } catch (error) {
      // If token is malformed or already expired, try to refresh anyway
      console.error('Error checking token expiration:', error);
      try {
        await this.refreshAccessToken();
      } catch (refreshError) {
        // If refresh fails, let the API interceptor handle it
        console.error('Failed to refresh token:', refreshError);
      }
    }
  }

  async refreshAccessToken(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<{ accessToken: string }>('/auth/refresh-token', {
      refreshToken
    });

    if (response.success && response.data) {
      localStorage.setItem('accessToken', response.data.accessToken);
    } else {
      throw new Error(response.message || 'Failed to refresh token');
    }
  }

  isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const user = this.getStoredUser();
    
    const isAuth = !!accessToken && !!refreshToken && !!user;
    
    console.log('isAuthenticated check:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasUser: !!user,
      result: isAuth
    });
    
    return isAuth;
  }
}

export default new AuthService();

