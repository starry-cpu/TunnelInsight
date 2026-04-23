import { api } from './api';
import type {
  RegisterRequest,
  AuthResponse,
  User,
  ForgotPasswordResponse
} from '../types';

class AuthService {
  async login(username: string, password: string): Promise<AuthResponse> {
    console.log('AuthService.login called with:', username);
    // Send as JSON, matching backend LoginRequest schema
    const response = await api.post<AuthResponse>('/auth/login', {
      username,
      password,
      grant_type: 'password',
    });
    console.log('API response:', response);

    // API returns { success: true, data: { access_token, user, ... } }
    // We need to extract the data field
    if (!response.data) {
      console.error('No data in response:', response);
      throw new Error('Login failed: No data received');
    }
    console.log('Returning response.data:', response.data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<void> {
    await api.post('/auth/register', data);
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    if (!response.data?.user) {
      throw new Error('Failed to get user info');
    }
    return response.data.user;
  }

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    const response = await api.put<{ user: User }>('/auth/me', data);
    if (!response.data?.user) {
      throw new Error('Failed to update user info');
    }
    return response.data.user;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  }

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.upload<{ avatar_url: string }>('/auth/me/avatar', formData);
    if (!response.data) {
      throw new Error('Failed to upload avatar');
    }
    return response.data;
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
    if (!response.data) {
      throw new Error('Failed to send reset email');
    }
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
  }
}

export const authService = new AuthService();

