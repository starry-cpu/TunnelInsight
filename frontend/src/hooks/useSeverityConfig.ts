import { useEffect, useMemo } from 'react';
import { useUIStore } from '../stores/uiStore';
import type { SeverityLevel } from '../types/config.types';

interface SeverityConfig {
  loading: boolean;
  levels: SeverityLevel[];
  getConfig: (key: string) => { text: string; color: string };
  getAllConfig: () => Record<string, { text: string; color: string }>;
}

/**
 * 统一的严重程度配置 Hook
 *
 * 使用方式：
 * const { getConfig, getAllConfig } = useSeverityConfig();
 *
 * // 单个配置
 * const { text, color } = getConfig('high');
 *
 * // 批量获取（用于表格等场景）
 * const config = getAllConfig();
 * <Tag color={config[severity]?.color}>{config[severity]?.text}</Tag>
 */
export function useSeverityConfig(): SeverityConfig {
  const severityLevels = useUIStore(state => state.severityLevels);
  const severityLoading = useUIStore(state => state.severityLoading);
  const fetchSeverityLevels = useUIStore(state => state.fetchSeverityLevels);
  const getSeverityConfig = useUIStore(state => state.getSeverityConfig);

  useEffect(() => {
    fetchSeverityLevels();
  }, [fetchSeverityLevels]);

  const getAllConfig = useMemo(() => {
    const config: Record<string, { text: string; color: string }> = {};
    for (const level of severityLevels) {
      config[level.key] = {
        text: level.label,
        color: level.color,
      };
    }
    return config;
  }, [severityLevels]);

  return {
    loading: severityLoading,
    levels: severityLevels,
    getConfig: getSeverityConfig,
    getAllConfig: () => getAllConfig,
  };
}
