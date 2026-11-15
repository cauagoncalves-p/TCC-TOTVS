// frontend/src/types/auth.ts
export type UserRole = 'colaborador' | 'rh' | 'gestor';

export interface UserSession {
  id: number;
  role: UserRole;
  email?: string;
  mustChangePassword?: boolean;
}

export interface LoginResponse {
  token: string;
  mustChangePassword?: boolean;
}

export interface UserProfile {
  FullName: string;
  JobTitle: string;
  Department: string;
  HireDate: string;
}

export interface AdminEmployeeInfo {
  id: number;
  fullName: string;
  registration: string;
  jobTitle: string;
  department: string;
  status: string;
}

export interface AdminUserItem {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  employee: AdminEmployeeInfo | null;
}

export interface AdminUsersListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  employeeId: number;
  email: string;
  role: UserRole;
}

export interface CreateUserResponse {
  message: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
    isActive: boolean;
    mustChangePassword: boolean;
    employeeId: number;
  };
  tempPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  tempPassword: string;
  mustChangePassword: boolean;
}
