import { api } from './api';
import type {
  SeverityLevel,
  SeverityLevelCreate,
  SeverityLevelUpdate,
  StatusLevel,
  StatusLevelCreate,
  StatusLevelUpdate,
} from '../types/config.types';

interface ListResponse<T> {
  items: T[];
  total: number;
}

interface SeverityLevelResponse {
  severity_level: SeverityLevel;
}

interface StatusLevelResponse {
  status_level: StatusLevel;
}

interface DeleteResponse {
  message: string;
  migrated_records?: number;
}

class ConfigService {
  // ============= Severity Levels =============

  async getSeverityLevels(): Promise<SeverityLevel[]> {
    const response = await api.get<ListResponse<SeverityLevel>>('/config/severity');
    return response.data?.items || [];
  }

  async createSeverityLevel(data: SeverityLevelCreate): Promise<SeverityLevel> {
    const response = await api.post<SeverityLevelResponse>('/config/severity', data);
    if (!response.data?.severity_level) {
      throw new Error('Failed to create severity level');
    }
    return response.data.severity_level;
  }

  async updateSeverityLevel(id: string, data: SeverityLevelUpdate): Promise<SeverityLevel> {
    const response = await api.put<SeverityLevelResponse>(`/config/severity/${id}`, data);
    if (!response.data?.severity_level) {
      throw new Error('Failed to update severity level');
    }
    return response.data.severity_level;
  }

  async deleteSeverityLevel(id: string, migrateTo?: string): Promise<DeleteResponse> {
    const params = migrateTo ? { migrate_to: migrateTo } : {};
    const response = await api.delete<DeleteResponse>(`/config/severity/${id}`, { params });
    return response.data || { message: 'Deleted' };
  }

  // ============= Status Levels =============

  async getStatusLevels(): Promise<StatusLevel[]> {
    const response = await api.get<ListResponse<StatusLevel>>('/config/status');
    return response.data?.items || [];
  }

  async createStatusLevel(data: StatusLevelCreate): Promise<StatusLevel> {
    const response = await api.post<StatusLevelResponse>('/config/status', data);
    if (!response.data?.status_level) {
      throw new Error('Failed to create status level');
    }
    return response.data.status_level;
  }

  async updateStatusLevel(id: string, data: StatusLevelUpdate): Promise<StatusLevel> {
    const response = await api.put<StatusLevelResponse>(`/config/status/${id}`, data);
    if (!response.data?.status_level) {
      throw new Error('Failed to update status level');
    }
    return response.data.status_level;
  }

  async deleteStatusLevel(id: string): Promise<DeleteResponse> {
    const response = await api.delete<DeleteResponse>(`/config/status/${id}`);
    return response.data || { message: 'Deleted' };
  }
}

export const configService = new ConfigService();
