// frontend/src/features/retention/api.ts
import { http } from '../../services/http';
import {
  RetentionFilters,
  RetentionListResponse,
  RetentionSummary,
  RetentionModelConfig,
  RetentionEmployeeDetail,
  CreateFollowUpInput,
  FollowUpItem
} from './types';

export const retentionApi = {
  /**
   * Consulta a lista paginada e filtrada de colaboradores com índice de atenção (RH)
   * GET /api/retention/employees
   */
  async getEmployees(filters?: RetentionFilters): Promise<RetentionListResponse> {
    const params: Record<string, any> = {};
    if (filters?.scope) params.scope = filters.scope;
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    if (filters?.level) params.level = filters.level;
    if (filters?.q) params.q = filters.q;
    if (filters?.onlySignals) params.onlySignals = true;
    if (filters?.sort) params.sort = filters.sort;
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;

    const res = await http.get<RetentionListResponse>('/api/retention/employees', { params });
    return res.data;
  },

  /**
   * Consulta os detalhes completos de um colaborador (RH)
   * Registra auditoria individual no backend
   * GET /api/retention/employees/:id
   */
  async getEmployeeDetail(id: number | string): Promise<RetentionEmployeeDetail> {
    const res = await http.get<RetentionEmployeeDetail>(`/api/retention/employees/${id}`);
    return res.data;
  },

  /**
   * Consulta a contagem agregada de colaboradores por nível de atenção
   * GET /api/retention/summary
   */
  async getSummary(params?: { scope?: string; departmentId?: number | string }): Promise<RetentionSummary> {
    const res = await http.get<RetentionSummary>('/api/retention/summary', { params });
    return res.data;
  },

  /**
   * Consulta parâmetros e regras do cálculo para transparência
   * GET /api/retention/config
   */
  async getConfig(): Promise<RetentionModelConfig> {
    const res = await http.get<RetentionModelConfig>('/api/retention/config');
    return res.data;
  },

  /**
   * Dispara recálculo manual do índice de atenção
   * POST /api/retention/recalculate
   */
  async recalculate(): Promise<{ success: boolean; message: string; recalculatedAt: string }> {
    const res = await http.post('/api/retention/recalculate');
    return res.data;
  },

  /**
   * Registra uma ação de acompanhamento para o colaborador
   * POST /api/retention/employees/:id/follow-ups
   */
  async addFollowUp(employeeId: number | string, input: CreateFollowUpInput): Promise<FollowUpItem> {
    const res = await http.post<FollowUpItem>(`/api/retention/employees/${employeeId}/follow-ups`, input);
    return res.data;
  }
};
