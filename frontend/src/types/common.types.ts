// ============= Common Types =============

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  meta?: {
    timestamp: string;
  };
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  items: T[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============= User Types =============

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  locale: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  grant_type?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface ForgotPasswordResponse {
  message: string;
  token?: string;  // 仅开发环境返回
  debug_mode?: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

// ============= Tunnel Types =============

// 缺陷严重程度计数
export interface SeverityCounts {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

// ============= Project Types =============

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  tunnel_count?: number;
  total_defects?: number;
  severity_counts?: SeverityCounts;
  unique_location_count: number;
  health_index: number;
  status?: StatusInfo;
  created_at: string;
  updated_at: string;
}

export interface TunnelBrief {
  id: string;
  name: string;
  location?: string;
  length_km?: number;
  total_defects?: number;
  severity_counts?: SeverityCounts;
  unique_location_count?: number;
  health_index?: number;
  longitude?: number;
  latitude?: number;
}

export interface ProjectDetail extends Project {
  tunnels: TunnelBrief[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectWithStatus extends Omit<Project, 'status'> {
  status: TunnelStatus;
}

export interface Tunnel {
  id: string;
  user_id: string;
  project_id: string;  // 必须属于某个项目
  name: string;
  location?: string;
  description?: string;
  length_km?: number;
  longitude?: number;
  latitude?: number;
  total_defects?: number;
  severity_counts?: SeverityCounts;
  unique_location_count: number;
  health_index: number;
  last_analysis_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TunnelGroup {
  tunnel_id: string;
  tunnel_name: string;
  location?: string;
  total_defects: number;
  last_analysis_at: string;
  defect_types: {
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high';
  }[];
  records: DefectRecord[];
}

export interface CreateTunnelRequest {
  project_id: string;  // 必须指定项目
  name: string;
  location?: string;
  description?: string;
  length_km?: number;
  longitude?: number;
  latitude?: number;
}

// ============= Location Types =============

export interface Location {
  id: string;
  tunnel_id: string;
  stake_mark: string;
  direction: 'left' | 'right' | 'top' | 'bottom';
  position_description?: string;
  longitude?: number;
  latitude?: number;
  created_at: string;
}

// ============= Defect Types =============

export interface AnalysisSettings {
  temperature: number;
  top_k: number;
  max_tokens: number;
  top_p: number;
  instruction: string;
}

export interface DefectRecord {
  id: string;
  user_id: string;
  tunnel_id?: string;
  tunnel_name?: string;
  location_id?: string;
  image_path: string;
  final_result: string;
  raw_response?: string;
  model_used: string;
  inference_time_ms?: number;
  settings: AnalysisSettings;
  defect_type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  // 位置信息
  stake_mark?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  // RAG 修复建议
  repair_suggestion?: string;
  suggestion_sources?: string[];
  rag_available?: boolean;
  rag_model_used?: string;
  rag_query_time_ms?: number;
  created_at: string;
  updated_at: string;
}

// RAG 修复建议
export interface RepairSuggestion {
  suggestion: string;
  sources: string[];
  confidence: number;
  fallback?: boolean;
}

// 缺陷分析响应（包含 RAG 修复建议）
export interface DefectAnalyzeResponse {
  id: string;
  image_path: string;
  // 缺陷检测结果
  final_result: string;
  defect_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  model_used: string;
  inference_time_ms: number;
  // 修复建议
  repair_suggestion: RepairSuggestion | null;
  rag_available: boolean;
  rag_query_time_ms: number;
  created_at: string;
}

export interface AnalyzeRequest {
  file: File;
  tunnel_id?: string;
  location_id?: string;
  stake_mark?: string;
  direction?: string;
  settings: AnalysisSettings;
}

// ============= History Types =============

export interface HistoryFilters extends PaginationParams {
  q?: string;
  tunnel_id?: string;
  tunnel_name?: string;
  date_from?: string;
  date_to?: string;
  defect_type?: string;
  severity?: string;
}

export interface HistoryStats {
  total_records: number;
  today_records: number;
  week_records: number;
  unique_tunnels: number;
  top_defect_types: {
    type: string;
    count: number;
  }[];
}

// ============= Status Types =============

export type TunnelStatus = 'normal' | 'minor' | 'warning' | 'critical';

export interface StatusInfo {
  key: string;
  label: string;
  color: string;
}

export interface TunnelWithStatus extends Tunnel {
  status: TunnelStatus;
  progress: number;
}

// ============= Settings Types =============

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  email_notifications: boolean;
  push_notifications: boolean;
  weekly_report: boolean;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: 'analysis' | 'storage' | 'security' | 'performance';
  type: 'string' | 'number' | 'boolean' | 'json';
  updated_at: string;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh-CN' | 'en-US';
  email_notifications?: boolean;
  push_notifications?: boolean;
  weekly_report?: boolean;
  alert_threshold?: number;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    alerts: boolean;
    reports: boolean;
    system_updates: boolean;
  };
  push: {
    enabled: boolean;
    alerts: boolean;
    reports: boolean;
    system_updates: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
}

// ============= 演变分析类型 =============

export interface EvolutionAnalysisRequest {
  defect_ids: string[];
}

export interface EvolutionScores {
  deterioration_rate: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  urgency_score: number;
}

export interface EvolutionReport {
  timeline_summary: string;
  trend: 'deteriorating' | 'stable' | 'improving';
  cause_analysis: string;
  repair_priority: string;
  future_prediction: string;
}

export interface EvolutionTimeRange {
  start: string;
  end: string;
}

export interface EvolutionAnalysisResult {
  analysis_id: string;
  stake_mark: string;
  direction: string;
  time_range: EvolutionTimeRange;
  records_analyzed: number;
  scores: EvolutionScores;
  report: EvolutionReport;
  records: DefectRecord[];
  created_at: string;
}

// ============= Map Types =============

export interface MapLocation {
  longitude: number;
  latitude: number;
  address?: string;
}
