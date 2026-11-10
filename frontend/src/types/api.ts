// Tipos padronizados da API do TOTVS RH Inteligente

export type RiskLevel = 'baixo' | 'moderado' | 'alto';
export type PriorityLevel = 'baixa' | 'media' | 'alta';
export type IssueStatus = 'aberta' | 'corrigida' | 'ignorada';

// --- New Types for Phase F1 ---
export interface MeResponse {
  FullName: string;
  JobTitle: string;
  Department: string;
  HireDate: string; // YYYY-MM-DD
}

export interface ChatMessage {
  Id: number;
  Role: 'user' | 'model';
  Content: string;
  ToolUsed?: string | null;
  CreatedAt: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  toolUsed?: string | null;
}

export interface ChatSessionMessageResponse {
  sessionId: string;
  messages: ChatMessage[];
}

export type EsocialEventStatus = 'pendente' | 'com_inconsistencias' | 'pronto_para_envio' | 'enviado_simulado';
export type OnboardingStatus = 'pendente_revisao' | 'aprovado' | 'rejeitado';

// --- Onboarding Types (Fase F2) ---
export interface CandidateData {
  fullName: string;
  cpf: string;
  rg?: string;
  birthDate: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  city: string;
  state: string;
  jobTitle: string;
  department: string;
  hireDate: string;
  baseSalary?: number | string;
}

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface OnboardingCaseSummary {
  Id: number;
  Status: OnboardingStatus;
  SourceFileName: string;
  CreatedAt: string;
  ReviewedAt?: string | null;
  EmployeeId?: number | null;
  CreatedByName?: string;
  ReviewedByName?: string | null;
}

export interface OnboardingCaseDetail {
  id: number;
  status: OnboardingStatus;
  sourceFileName: string;
  extractedData: CandidateData;
  reviewedData: CandidateData;
  validationIssues: ValidationIssue[];
  canApprove: boolean;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  employeeId?: number | null;
  rejectionReason?: string | null;
}

export interface OnboardingApprovalResult {
  message: string;
  caseId: number;
  userId: number;
  employeeId: number;
  registration: string;
  initialPassword?: string;
}

export interface OnboardingRejectResult {
  message: string;
  caseId: number;
  status: 'rejeitado';
}

// Analytics
export interface Department {
  Id: number;
  Name: string;
  IsActive: boolean;
}

export interface SummaryCardItem {
  value: number;
  unit: string;
  delta?: number | null;
}

export interface AnalyticsSummary {
  period: {
    from: string;
    to: string;
    monthsCount: number;
  };
  departmentId?: number | null;
  cards: {
    absenceRate: SummaryCardItem;
    overtimePerEmployee: SummaryCardItem;
    turnoverRate: SummaryCardItem;
    activeAlerts: SummaryCardItem;
  };
  totals: {
    avgHeadcount: number;
    totalAbsenceDays: number;
    totalOvertimeHours: number;
    totalHires: number;
    totalTerminations: number;
  };
}

export interface TimeseriesPoint {
  Id: number;
  DepartmentId: number;
  DepartmentName: string;
  MonthRef: string;
  Headcount: number;
  WorkDays: number;
  AbsenceDays: number;
  OvertimeHours: number;
  Hires: number;
  Terminations: number;
  AbsenceRate: number;
  OvertimePerEmployee: number;
  TurnoverRate: number;
}

export interface Hotspot {
  DepartmentId: number;
  DepartmentName: string;
  ActiveAlertsCount: number;
  HighRiskCount: number;
  ModerateRiskCount: number;
  LowRiskCount: number;
  RiskScore: number;
}

// Alertas
export interface AlertItem {
  Id: number;
  DepartmentId: number;
  DepartmentName: string;
  RuleCode: string;
  RiskLevel: RiskLevel;
  Source: string;
  ReferenceMonth: string;
  IndicatorsJson: string;
  indicators?: Record<string, any>;
  Justification: string;
  Recommendation: string;
  Status: 'novo' | 'lido' | 'resolvido';
  CreatedAt: string;
}

// Compliance
export interface ComplianceRule {
  Id: number;
  Code: string;
  Category: 'integridade' | 'clt' | 'esocial';
  EventCode?: string | null;
  Severity: PriorityLevel;
  Title: string;
  Description: string;
  Guidance: string;
  SourceType: 'interna' | 'oficial';
  SourceReference: string;
  SourceVerified: boolean;
  IsActive: boolean;
}

export interface ComplianceIssue {
  Id: number;
  RuleId: number;
  RuleCode: string;
  RuleTitle: string;
  RuleCategory: string;
  Guidance: string;
  SourceType: 'interna' | 'oficial';
  SourceReference: string;
  SourceVerified: boolean;
  EmployeeId?: number | null;
  EmployeeName?: string | null;
  EmployeeRegistration?: string | null;
  EmployeeDepartment?: string | null;
  EntityType: string;
  EntityId: number;
  EventCode?: string | null;
  Priority: PriorityLevel;
  Description: string;
  Status: IssueStatus;
  DetectedAt: string;
  ResolutionNote?: string | null;
}

export interface EsocialEvent {
  Id: number;
  EmployeeId: number;
  EmployeeName?: string;
  EmployeeRegistration?: string;
  EmployeeDepartment?: string;
  LeaveId?: number | null;
  EventCode: 'S-2200' | 'S-2230' | 'S-2299';
  EventDate: string;
  Status: EsocialEventStatus;
  LastRunId?: string | null;
  ConfirmedBy?: number | null;
  ConfirmedAt?: string | null;
}

export interface ComplianceRun {
  Id: number;
  Scope: 'cadastros' | 'esocial' | string;
  EventCode?: string | null;
  StartedBy: number;
  StartedByName?: string;
  StartedAt: string;
  FinishedAt?: string | null;
  RecordsAnalyzed?: number;
  IssuesNew?: number;
  IssuesOpen?: number;
}

export interface ComplianceAuditLogItem {
  Id: number;
  UserId?: number | null;
  UserName?: string | null;
  UserRole?: string | null;
  Action: string;
  EntityType?: string | null;
  EntityId?: string | null;
  DetailsJson?: string | null;
  details?: Record<string, any>;
  CreatedAt: string;
}

export interface ObligationItem {
  id: string;
  title: string;
  code: string;
  dueDate: string;
  status: 'em_dia' | 'proximo' | 'pendente' | 'atrasado' | 'concluida';
  responsible: string;
  category: 'trabalhista' | 'previdenciaria' | 'fiscal';
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  type: 'clt' | 'manual_esocial' | 'acordo_coletivo' | 'politica_interna';
  version: string;
  publishDate: string;
  validity: string;
  isCurrent: boolean;
  fileSize?: string;
}

export interface AssistantSourceCitation {
  documentTitle: string;
  version: string;
  section: string;
  publishDate: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AssistantSourceCitation[];
  isUnconfirmed?: boolean;
  timestamp: string;
}
