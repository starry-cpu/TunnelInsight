// ============= Severity Level Types =============

export interface SeverityLevel {
  id: string;
  key: string;
  label: string;
  score_weight: number;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeverityLevelCreate {
  key: string;
  label: string;
  score_weight: number;
  color: string;
  sort_order?: number;
}

export interface SeverityLevelUpdate {
  label?: string;
  score_weight?: number;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ============= Status Level Types =============

export interface StatusLevel {
  id: string;
  key: string;
  label: string;
  min_score: number;
  max_score: number | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusLevelCreate {
  key: string;
  label: string;
  min_score: number;
  max_score: number | null;
  color: string;
  sort_order?: number;
}

export interface StatusLevelUpdate {
  label?: string;
  min_score?: number;
  max_score?: number | null;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}
