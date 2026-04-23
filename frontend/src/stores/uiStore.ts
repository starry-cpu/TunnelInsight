import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SeverityLevel, StatusLevel } from '../types/config.types';
import { configService } from '../services/config.service';

// 将十六进制颜色映射为 Ant Design Tag 预设色
const STATUS_COLOR_TO_TAG: Record<string, string> = {
  '#10b981': 'success',
  '#3b82f6': 'processing',
  '#f59e0b': 'warning',
  '#ef4444': 'error',
  '#52c41a': 'success',
  '#1890ff': 'processing',
  '#fa8c16': 'warning',
  '#f5222d': 'error',
};

const getTagColor = (hexColor: string): string => {
  return STATUS_COLOR_TO_TAG[hexColor.toLowerCase()] || hexColor;
};

// 默认状态等级配置
const DEFAULT_STATUS_LEVELS: StatusLevel[] = [
  { key: 'normal', label: '运行正常', min_score: 80, max_score: null, color: '#10b981', sort_order: 0, is_active: true, id: '', created_at: '', updated_at: '' },
  { key: 'minor', label: '轻微警告', min_score: 60, max_score: 80, color: '#3b82f6', sort_order: 1, is_active: true, id: '', created_at: '', updated_at: '' },
  { key: 'warning', label: '一般警告', min_score: 40, max_score: 60, color: '#f59e0b', sort_order: 2, is_active: true, id: '', created_at: '', updated_at: '' },
  { key: 'critical', label: '严重警告', min_score: 0, max_score: 40, color: '#ef4444', sort_order: 3, is_active: true, id: '', created_at: '', updated_at: '' },
];

interface UIState {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Language
  locale: 'zh-CN' | 'en-US';
  setLocale: (locale: 'zh-CN' | 'en-US') => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Severity Config
  severityLevels: SeverityLevel[];
  severityLoading: boolean;
  severityLastFetch: number | null;
  fetchSeverityLevels: (force?: boolean) => Promise<void>;
  getSeverityConfig: (key: string) => { text: string; color: string };

  // Status Config
  statusLevels: StatusLevel[];
  statusLoading: boolean;
  statusLastFetch: number | null;
  fetchStatusLevels: (force?: boolean) => Promise<void>;
  getStatusInfo: (score: number) => { key: string; label: string; color: string; tagColor: string };
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Theme
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      setTheme: (theme) => set({ theme }),

      // Language
      locale: 'zh-CN',
      setLocale: (locale) => set({ locale }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // Loading
      globalLoading: false,
      setGlobalLoading: (loading) => set({ globalLoading: loading }),

      // Severity Config
      severityLevels: [],
      severityLoading: false,
      severityLastFetch: null,

      // Status Config
      statusLevels: [],
      statusLoading: false,
      statusLastFetch: null,

      fetchSeverityLevels: async (force = false) => {
        const now = Date.now();
        const lastFetch = get().severityLastFetch;
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        // If already loading, don't duplicate request
        if (get().severityLoading) return;

        // If cached and not expired and not forced refresh, skip
        if (!force && lastFetch && now - lastFetch < CACHE_TTL && get().severityLevels.length > 0) {
          return;
        }

        set({ severityLoading: true });
        try {
          const levels = await configService.getSeverityLevels();
          set({
            severityLevels: levels,
            severityLastFetch: now,
          });
        } catch (error) {
          console.error('Failed to fetch severity levels:', error);
        } finally {
          set({ severityLoading: false });
        }
      },

      getSeverityConfig: (key: string) => {
        const levels = get().severityLevels;
        const level = levels.find((l) => l.key === key);
        if (level) {
          return { text: level.label, color: level.color };
        }
        // Fallback
        return { text: key, color: 'default' };
      },

      fetchStatusLevels: async (force = false) => {
        const now = Date.now();
        const lastFetch = get().statusLastFetch;
        const CACHE_TTL = 5 * 60 * 1000;

        if (get().statusLoading) return;

        if (!force && lastFetch && now - lastFetch < CACHE_TTL && get().statusLevels.length > 0) {
          return;
        }

        set({ statusLoading: true });
        try {
          const levels = await configService.getStatusLevels();
          const activeLevels = levels.filter(l => l.is_active);
          set({
            statusLevels: activeLevels.length > 0 ? activeLevels : DEFAULT_STATUS_LEVELS,
            statusLastFetch: now,
          });
        } catch (error) {
          console.error('Failed to fetch status levels:', error);
          set({ statusLevels: DEFAULT_STATUS_LEVELS });
        } finally {
          set({ statusLoading: false });
        }
      },

      getStatusInfo: (score: number) => {
        const levels = get().statusLevels.length > 0 ? get().statusLevels : DEFAULT_STATUS_LEVELS;
        const sorted = [...levels].sort((a, b) => a.sort_order - b.sort_order);

        for (const level of sorted) {
          const minMatch = score >= level.min_score;
          const maxMatch = level.max_score === null || score < level.max_score;
          if (minMatch && maxMatch) {
            return {
              key: level.key,
              label: level.label,
              color: level.color,
              tagColor: getTagColor(level.color),
            };
          }
        }

        // 如果 no match, return the last level (critical)
        const last = sorted[sorted.length - 1] || DEFAULT_STATUS_LEVELS[3];
        return {
          key: last.key,
          label: last.label,
          color: last.color,
          tagColor: getTagColor(last.color),
        };
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        sidebarCollapsed: state.sidebarCollapsed,
        severityLevels: state.severityLevels,
        statusLevels: state.statusLevels,
      }),
    }
  )
);
