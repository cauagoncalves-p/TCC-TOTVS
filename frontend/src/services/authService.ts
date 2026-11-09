import http from './http';
import { LoginResponse, UserSession, UserRole } from '../types/auth';

const TOKEN_KEY = 'totvs_token';
const USER_KEY = 'totvs_user';

function parseJwt(token: string): { id: number; role: UserRole } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const authService = {
  async login(email: string, password: string): Promise<UserSession> {
    const response = await http.post<LoginResponse>('/api/auth/login', { email, password });
    const { token } = response.data;

    sessionStorage.setItem(TOKEN_KEY, token);

    const payload = parseJwt(token);
    if (!payload) {
      throw new Error('Falha ao decodificar token de acesso.');
    }

    const session: UserSession = {
      id: payload.id,
      role: payload.role,
      email
    };

    sessionStorage.setItem(USER_KEY, JSON.stringify(session));
    return session;
  },

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  },

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  getUser(): UserSession | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken() && this.getUser());
  }
};
