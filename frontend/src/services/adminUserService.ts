// frontend/src/services/adminUserService.ts
import http from './http';
import {
  AdminUsersListResponse,
  CreateUserPayload,
  CreateUserResponse,
  ResetPasswordResponse,
  AdminUserItem,
  UserRole
} from '../types/auth';

export interface ListUsersParams {
  search?: string;
  role?: string;
  active?: boolean | string;
  page?: number;
  limit?: number;
}

export const adminUserService = {
  async listUsers(params: ListUsersParams = {}): Promise<AdminUsersListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.active !== undefined && params.active !== '') {
      query.append('active', String(params.active));
    }
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const response = await http.get<AdminUsersListResponse>(`/api/admin/users?${query.toString()}`);
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
    const response = await http.post<CreateUserResponse>('/api/admin/users', payload);
    return response.data;
  },

  async updateUser(id: number, payload: { role?: UserRole; isActive?: boolean }): Promise<{ message: string; user: AdminUserItem }> {
    const response = await http.patch<{ message: string; user: AdminUserItem }>(`/api/admin/users/${id}`, payload);
    return response.data;
  },

  async resetPassword(id: number): Promise<ResetPasswordResponse> {
    const response = await http.post<ResetPasswordResponse>(`/api/admin/users/${id}/reset-password`);
    return response.data;
  }
};
