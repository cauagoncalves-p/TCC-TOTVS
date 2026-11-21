// frontend/src/features/retention/types.ts

export type AttentionLevel = 'alta' | 'moderada' | 'baixa' | 'insuficiente' | 'nao_aplicavel';
export type DataQuality = 'completo' | 'parcial' | 'insuficiente';
export type TrendDirection = 'subindo' | 'estavel' | 'caindo';

export type FollowUpActionType =
  | 'conversa_1_1'
  | 'revisao_carga'
  | 'revisao_salarial'
  | 'plano_desenvolvimento'
  | 'outro';

export interface ScoreComponentDetail {
  points: number;
  maxPoints: number;
  phrase: string;
}

export interface ScoreComponents {
  sobrecarga: ScoreComponentDetail;
  ausencias: ScoreComponentDetail;
  estagnacao: ScoreComponentDetail;
}

export interface RetentionEmployee {
  id: number;
  fullName: string;
  registration: string;
  department: string;
  departmentId?: number;
  jobTitle: string;
  contractType: string;
  tenureMonths: number;
  lastMonthAbsences: number;
  recentAbsences: number;
  avgRecentOvertime: number;
  monthsSinceLastMovement: number;
  vacationBalanceDays: number;
  score: number | null;
  level: AttentionLevel;
  levelLabel: string;
  dataQuality: DataQuality;
  signals: string[];
  trend: TrendDirection;
  components?: ScoreComponents | null;
}

export interface CareerEventItem {
  id: number;
  eventDate: string;
  eventType: 'admissao' | 'reajuste' | 'promocao' | 'mudanca_cargo';
  newJobTitle?: string | null;
  note?: string | null;
}

export interface FollowUpItem {
  id: number;
  actionType: FollowUpActionType;
  note: string;
  createdAt: string;
  createdByName?: string;
}

export interface MonthlySeriesPoint {
  month: string; // YYYY-MM
  personAbsences: number | null;
  deptMedianAbsences: number;
  personOvertime: number | null;
  deptMedianOvertime: number;
}

export interface RetentionEmployeeDetail extends RetentionEmployee {
  careerHistory: CareerEventItem[];
  followUps: FollowUpItem[];
  series12Months: MonthlySeriesPoint[];
  a11ySummary: string;
}

export interface RetentionDepartment {
  Id: number;
  Name: string;
}

export interface RetentionSummary {
  total: number;
  alta: number;
  moderada: number;
  baixa: number;
  insuficiente: number;
  nao_aplicavel: number;
}

export interface RetentionFilters {
  scope: 'company' | 'department';
  departmentId?: number | string;
  level?: AttentionLevel | '';
  q?: string;
  onlySignals?: boolean;
  sort?: 'score_desc' | 'score_asc' | 'absences_desc' | 'overtime_desc' | 'stagnation_desc' | 'name_asc';
  page?: number;
  limit?: number;
}

export interface RetentionListResponse {
  employees: RetentionEmployee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  departments: RetentionDepartment[];
}

export interface RetentionModelConfig {
  version: string;
  name: string;
  description: string;
  thresholds: {
    lowMax: number;
    moderateMin: number;
    moderateMax: number;
    highMin: number;
  };
  components: Record<string, any>;
  disclaimers: {
    restrictedUse: string;
    prohibitedUses: string;
    excludedData: string[];
  };
}

export interface CreateFollowUpInput {
  actionType: FollowUpActionType;
  note: string;
}
