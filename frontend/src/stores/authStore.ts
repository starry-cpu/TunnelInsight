import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthResponse, RegisterRequest } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (auth: AuthResponse) => void;
  login: (username: string, password: string) => Promise<void>;
  devLogin: () => void; // 开发模式：模拟登录
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (auth: AuthResponse) => {
        set({
          user: auth.user,
          token: auth.access_token,
          isAuthenticated: true,
        });
      },

      login: async (username: string, password: string) => {
        const { authService } = await import('../services/auth.service');
        console.log('Calling authService.login...');
        const response = await authService.login(username, password);
        console.log('Login response:', response);
        get().setAuth(response);
        console.log('setAuth completed');
      },

      devLogin: () => {
        // 开发模式：模拟登录，用于测试前端界面
        const mockUser: User = {
          id: 'dev-user-123',
          username: '开发测试账号',
          email: 'dev@test.com',
          full_name: '测试用户',
          avatar_url: undefined,
          locale: 'zh-CN',
          is_active: true,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set({
          user: mockUser,
          token: 'dev-token-mock',
          isAuthenticated: true,
        });
      },

      register: async (data: RegisterRequest) => {
        const { authService } = await import('../services/auth.service');
        await authService.register(data);
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
