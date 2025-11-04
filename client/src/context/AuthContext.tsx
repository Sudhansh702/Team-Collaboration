import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '../services/auth.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Debug: Check what's in localStorage
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUserStr = localStorage.getItem('user');
        
        console.log('Auth initialization - localStorage check:');
        console.log('accessToken exists:', !!accessToken);
        console.log('accessToken value:', accessToken ? `${accessToken.substring(0, 20)}...` : 'null');
        console.log('refreshToken exists:', !!refreshToken);
        console.log('user exists:', !!storedUserStr);
        console.log('user value (raw):', storedUserStr);
        
        // Try to parse user manually for debugging
        if (storedUserStr) {
          try {
            const parsedUser = JSON.parse(storedUserStr);
            console.log('Parsed user manually:', parsedUser);
            console.log('User _id:', parsedUser._id);
            console.log('User email:', parsedUser.email);
          } catch (e) {
            console.error('Error parsing user string:', e);
          }
        }
        
        const storedUser = authService.getStoredUser();
        const hasToken = authService.isAuthenticated();
        
        console.log('storedUser from service:', storedUser);
        console.log('hasToken from service:', hasToken);
        
        if (storedUser && hasToken) {
          // Set stored user immediately to prevent identity loss
          console.log('Setting stored user in context');
          setUser(storedUser);
          
          // Try to refresh token proactively if needed
          try {
            // Check if access token is about to expire and refresh proactively
            await authService.refreshTokenIfNeeded();
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError);
            // Continue anyway - API interceptor will handle refresh on next request
          }
          
          // Try to get fresh user data in background
          try {
            const currentUser = await authService.getCurrentUser();
            console.log('Successfully refreshed user data');
            setUser(currentUser);
          } catch (error: any) {
            // If token is invalid or expired, try one more time after potential refresh
            console.error('Failed to refresh user:', error);
            console.error('Error response status:', error?.response?.status);
            
            // If user data was cleared but we have tokens, try to restore from stored data
            const storedUserStill = authService.getStoredUser();
            if (!storedUserStill) {
              // User data might have been cleared - check if we can restore it
              console.warn('User data missing from localStorage but tokens exist');
              const storedUserStr = localStorage.getItem('user');
              if (storedUserStr && storedUserStr !== 'null' && storedUserStr !== '{}') {
                try {
                  const parsed = JSON.parse(storedUserStr);
                  if (parsed && parsed._id && parsed.email) {
                    // User data exists, restore it
                    console.log('Restoring user data from localStorage');
                    setUser(parsed);
                  }
                } catch (e) {
                  console.error('Failed to restore user data:', e);
                }
              }
            }
            
            // Only clear if refresh token is also expired or invalid
            // The API interceptor should have tried to refresh already
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              // Check if we have a refresh token - if so, token might refresh on next request
              const refreshTokenCheck = localStorage.getItem('refreshToken');
              console.log('401/403 error - refresh token exists:', !!refreshTokenCheck);
              
              if (!refreshTokenCheck) {
                // No refresh token, must logout
                console.log('No refresh token - logging out');
                authService.logout();
                setUser(null);
              } else {
                // Keep user logged in - token will refresh on next API call via interceptor
                // Just keep using stored user
                console.log('Keeping user logged in - token will refresh on next request');
                // Try to restore user if we still have tokens
                const userStill = authService.getStoredUser();
                if (userStill) {
                  setUser(userStill);
                }
              }
            }
            // Otherwise, keep using stored user
          }
        } else {
          console.log('No stored user or token - user not authenticated');
          
          // If we have tokens but no user, try to restore user data
          if (accessToken && refreshToken && !storedUser) {
            console.log('Tokens exist but user data missing - attempting to restore...');
            try {
              // Try to fetch user data using existing tokens
              const restoredUser = await authService.getCurrentUser();
              console.log('Successfully restored user data from API');
              setUser(restoredUser);
            } catch (restoreError: any) {
              console.error('Failed to restore user data:', restoreError);
              
              // If restore fails, check if tokens are still valid
              if (restoreError?.response?.status === 401 || restoreError?.response?.status === 403) {
                // Tokens are invalid - clear everything
                console.log('Tokens are invalid - clearing auth');
                authService.logout();
                setUser(null);
              } else {
                // Network or other error - keep tokens but don't set user
                // User will need to manually refresh or retry
                console.warn('Could not restore user - keeping tokens for retry');
                setUser(null);
              }
            }
          } else if (!storedUser && !hasToken) {
            // No stored data at all, ensure user is null
            setUser(null);
          } else {
            // Partial data exists - log for debugging
            console.warn('Partial auth data found:', {
              hasUser: !!storedUser,
              hasToken: !!accessToken,
              hasRefreshToken: !!refreshToken
            });
            // Try to keep user if we have tokens
            if (accessToken && refreshToken && storedUser) {
              setUser(storedUser);
            } else {
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Try to recover - check if we have tokens
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        const storedUser = authService.getStoredUser();
        
        if (storedUser && accessToken && refreshToken) {
          // We have everything, restore user
          console.log('Recovering with stored user after error');
          setUser(storedUser);
        } else if (accessToken && refreshToken && !storedUser) {
          // We have tokens but no user - try to restore
          console.log('Attempting to restore user after error');
          try {
            const restoredUser = await authService.getCurrentUser();
            console.log('Successfully restored user after error');
            setUser(restoredUser);
          } catch (restoreError) {
            console.error('Failed to restore user after error:', restoreError);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, username: string) => {
    const response = await authService.register(email, password, username);
    if (response.success && response.data) {
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

