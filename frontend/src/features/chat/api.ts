import http from '../../services/http';
import { ChatResponse, ChatSessionMessageResponse } from '../../types/api';

/**
 * Envia uma mensagem ao chatbot.
 * Se sessionId for omitido, o backend cria uma nova sessão.
 */
export const postChatMessage = async (payload: {
  sessionId?: string;
  message: string;
}): Promise<ChatResponse> => {
  const response = await http.post<ChatResponse>('/api/chat', payload);
  return response.data;
};

/**
 * Obtém as mensagens de uma sessão existente.
 */
export const getChatMessages = async (
  sessionId: string
): Promise<ChatSessionMessageResponse> => {
  const response = await http.get<ChatSessionMessageResponse>(
    `/api/chat/sessions/${sessionId}/messages`
  );
  return response.data;
};
