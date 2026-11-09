export type UserRole = 'colaborador' | 'rh' | 'gestor';

export interface UserSession {
  id: number;
  role: UserRole;
  email?: string;
}

export interface LoginResponse {
  token: string;
}

export interface UserProfile {
  FullName: string;
  JobTitle: string;
  Department: string;
  HireDate: string;
}
