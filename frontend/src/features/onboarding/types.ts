// frontend/src/features/onboarding/types.ts

export type OnboardingStatus = 'pendente_revisao' | 'aprovado' | 'rejeitado';
export type OnboardingOrigin = 'pdf' | 'manual';
export type FieldProvenance = 'ia' | 'editado' | 'digitado';
export type IssueNature = 'pendente' | 'erro' | 'aviso';

export interface CandidateData {
  fullName: string;
  cpf: string;
  rg?: string;
  birthDate: string; // YYYY-MM-DD
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  city: string;
  state: string; // UF (2 chars)
  jobTitle: string;
  department: string;
  hireDate: string; // YYYY-MM-DD
  baseSalary?: number | string;
}

export interface CandidateProfile {
  education?: Array<{
    course: string;
    institution: string;
    level: string;
    startDate?: string;
    endDate?: string;
    inProgress?: boolean;
  }>;
  experience?: Array<{
    jobTitle: string;
    company: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description?: string;
  }>;
  skills?: string[];
  certifications?: string[];
  languages?: Array<{ language: string; level: string }>;
  projects?: Array<{ name: string; description: string; technologies?: string }>;
}

export interface ValidationIssue {
  field: string;
  code: string;
  nature?: IssueNature;
  message: string;
  conflictValues?: Record<string, string>;
  sources?: string[];
}

export interface OnboardingDocumentItem {
  id: number;
  fileName: string;
  documentType: string;
  typeSource: 'ia' | 'manual';
  extractionMethod?: string;
  pageCount?: number | null;
  createdAt: string;
}

export interface OnboardingCaseSummary {
  Id: number;
  Status: OnboardingStatus;
  Origin?: OnboardingOrigin;
  SourceFileName?: string | null;
  CreatedAt: string;
  ReviewedAt?: string | null;
  EmployeeId?: number | null;
  CreatedByName?: string | null;
  ReviewedByName?: string | null;
}

export interface OnboardingCaseDetail {
  id: number;
  caseId?: number;
  status: OnboardingStatus;
  origin: OnboardingOrigin;
  sourceFileName?: string | null;
  documents?: OnboardingDocumentItem[];
  extractedData?: {
    cadastro?: CandidateData;
    perfil?: CandidateProfile | null;
    [key: string]: any;
  };
  reviewedData?: {
    cadastro?: CandidateData;
    perfil?: CandidateProfile | null;
    [key: string]: any;
  };
  validationIssues?: ValidationIssue[];
  canApprove: boolean;
  createdBy?: number;
  createdByName?: string | null;
  createdAt: string;
  reviewedBy?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  employeeId?: number | null;
  rejectionReason?: string | null;
}

export interface ValidateCadastroResponse {
  validationIssues: ValidationIssue[];
  issues?: ValidationIssue[];
  canApprove: boolean;
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
