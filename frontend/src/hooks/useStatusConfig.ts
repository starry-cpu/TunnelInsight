import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import type { StatusLevel } from '../types/config.types';

export interface StatusInfo {
  key: string;
  label: string;
  color: string;
  tagColor: string;
}

interface StatusConfig {
  loading: boolean;
  levels: StatusLevel[];
  getStatusInfo: (score: number) => StatusInfo;
}

/**
 * 统一的状态等级配置 Hook
 *
 * 使用方式：
 * const { getStatusInfo, loading } = useStatusConfig();
 * const info = getStatusInfo(healthIndex);
 * <Tag color={info.tagColor}>{info.label}</Tag>
 */
export function useStatusConfig(): StatusConfig {
  const statusLevels = useUIStore(state => state.statusLevels);
  const statusLoading = useUIStore(state => state.statusLoading);
  const fetchStatusLevels = useUIStore(state => state.fetchStatusLevels);
  const getStatusInfo = useUIStore(state => state.getStatusInfo);

  useEffect(() => {
    fetchStatusLevels();
  }, [fetchStatusLevels]);

  return {
    loading: statusLoading,
    levels: statusLevels,
    getStatusInfo,
  };
}
