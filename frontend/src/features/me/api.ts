import http from '../../services/http';
import { MeResponse } from '../../types/api';

/**
 * Busca os dados cadastrais do colaborador logado.
 */
export const getMe = async (): Promise<MeResponse> => {
  const response = await http.get<MeResponse>('/api/me');
  return response.data;
};
