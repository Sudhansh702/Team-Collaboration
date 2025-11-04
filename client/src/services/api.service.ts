import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import { ApiResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(
              `${API_URL}/auth/refresh-token`,
              { refreshToken }
            );

            const { accessToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.api(originalRequest);
          } catch (refreshError: any) {
            // Refresh failed - only clear if refresh token is truly invalid
            // Don't clear if it's a network error or other temporary issue
            console.error('Token refresh failed:', refreshError);
            
            // Check if it's a token expiration issue vs network error
            if (refreshError?.response?.status === 401 || refreshError?.response?.status === 403) {
              console.log('Refresh token expired or invalid - clearing auth');
              // Only clear tokens if refresh token is truly expired/invalid
              // Clear tokens first, then user data
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              // Only clear user if we're definitely logging out (refresh token expired)
              // This is the ONLY place where user data should be cleared (besides logout)
              localStorage.removeItem('user');
              window.location.href = '/login';
            } else {
              console.log('Token refresh failed but might be temporary - keeping auth data');
              // Don't clear tokens on network errors - user can retry
              // Don't clear user data - preserve it for recovery
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic request methods
  async get<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.api.get<ApiResponse<T>>(url);
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.post<ApiResponse<T>>(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.api.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    const response = await this.api.delete<ApiResponse<T>>(url);
    return response.data;
  }

  // Upload file
  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    };

    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
    }

    const response = await this.api.post<ApiResponse>(url, formData, config);
    return response.data;
  }
}

export default new ApiService();

