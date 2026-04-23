import { api } from './api';
import type {
  DefectRecord,
  DefectAnalyzeResponse,
  AnalyzeRequest,
  AnalysisSettings,
  EvolutionAnalysisRequest,
  EvolutionAnalysisResult
} from '../types';

class DefectsService {
  async analyze(data: AnalyzeRequest): Promise<DefectAnalyzeResponse> {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.tunnel_id) formData.append('tunnel_id', data.tunnel_id);
    if (data.location_id) formData.append('location_id', data.location_id);
    if (data.stake_mark) formData.append('stake_mark', data.stake_mark);
    if (data.direction) formData.append('direction', data.direction);
    formData.append('settings_json', JSON.stringify(data.settings));

    const response = await api.upload<DefectAnalyzeResponse>('/defects/analyze', formData);
    if (!response.data) {
      throw new Error('Failed to analyze defect');
    }
    return response.data;
  }

  async getDefect(id: string): Promise<DefectRecord> {
    const response = await api.get<DefectRecord>(`/defects/${id}`);
    if (!response.data) {
      throw new Error('Failed to get defect');
    }
    return response.data;
  }

  async getSettings(): Promise<AnalysisSettings> {
    const response = await api.get<AnalysisSettings>('/defects/settings');
    if (!response.data) {
      throw new Error('Failed to get settings');
    }
    return response.data;
  }

  async saveSettings(settings: AnalysisSettings): Promise<void> {
    await api.post('/defects/settings', settings);
  }

  /**
   * 演变分析
   */
  async evolutionAnalysis(data: EvolutionAnalysisRequest): Promise<EvolutionAnalysisResult> {
    const response = await api.post<EvolutionAnalysisResult>('/defects/evolution-analysis', data);
    if (!response.data) {
      throw new Error('Failed to perform evolution analysis');
    }
    return response.data;
  }
}

export const defectsService = new DefectsService();
