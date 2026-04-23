import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStatusConfig } from '../useStatusConfig';
import { useUIStore } from '../../stores/uiStore';

// Mock useUIStore
vi.mock('../../stores/uiStore', () => ({
  useUIStore: vi.fn(),
}));

describe('useStatusConfig', () => {
  const mockFetchStatusLevels = vi.fn();
  const mockGetStatusInfo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useUIStore as any).mockImplementation((selector: any) => {
      const state = {
        statusLevels: [],
        statusLoading: false,
        fetchStatusLevels: mockFetchStatusLevels,
        getStatusInfo: mockGetStatusInfo,
      };
      return selector(state);
    });
  });

  it('should call fetchStatusLevels on mount', () => {
    renderHook(() => useStatusConfig());
    expect(mockFetchStatusLevels).toHaveBeenCalledTimes(1);
  });

  it('should return loading state', () => {
    (useUIStore as any).mockImplementation((selector: any) => {
      const state = {
        statusLevels: [],
        statusLoading: true,
        fetchStatusLevels: mockFetchStatusLevels,
        getStatusInfo: mockGetStatusInfo,
      };
      return selector(state);
    });

    const { result } = renderHook(() => useStatusConfig());
    expect(result.current.loading).toBe(true);
  });

  it('should return getStatusInfo function', () => {
    const { result } = renderHook(() => useStatusConfig());
    expect(typeof result.current.getStatusInfo).toBe('function');
  });
});
