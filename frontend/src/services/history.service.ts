import { api } from './api';
import type { HistoryFilters, PaginationResponse, DefectRecord, HistoryStats } from '../types';

class HistoryService {
  async getHistory(filters?: HistoryFilters): Promise<PaginationResponse<DefectRecord>> {
    const response = await api.get<PaginationResponse<DefectRecord>>('/history', {
      params: filters,
    });
    if (!response.data) {
      throw new Error('Failed to get history');
    }
    return response.data;
  }

  async getRecord(id: string): Promise<DefectRecord> {
    const response = await api.get<DefectRecord>(`/history/${id}`);
    if (!response.data) {
      throw new Error('Failed to get record');
    }
    return response.data;
  }

  async deleteRecord(id: string): Promise<void> {
    await api.delete(`/history/${id}`);
  }

  async getStats(): Promise<HistoryStats> {
    const response = await api.get<HistoryStats>('/history/stats');
    if (!response.data) {
      throw new Error('Failed to get stats');
    }
    return response.data;
  }

  async reanalyze(id: string): Promise<DefectRecord> {
    const response = await api.post<DefectRecord>(`/history/${id}/reanalyze`);
    if (!response.data) {
      throw new Error('Failed to reanalyze');
    }
    return response.data;
  }
}

export const historyService = new HistoryService();
