import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postChatMessage, getChatMessages } from './api';
import { ChatMessageItem } from '../../components/ui/ChatPanel';

const SESSION_STORAGE_KEY = 'totvs_chat_session_id';

export const useChat = () => {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  });
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Busca histórico de mensagens se houver sessionId
  const {
    data: sessionData,
    isLoading: isLoadingHistory,
    error: historyError,
  } = useQuery({
    queryKey: ['chatMessages', sessionId],
    queryFn: () => getChatMessages(sessionId!),
    enabled: !!sessionId,
    retry: 1,
  });

  // Atualiza mensagens locais quando o histórico do servidor é carregado
  useEffect(() => {
    if (sessionData?.messages) {
      const formatted = sessionData.messages.map((m: any, index: number) => ({
        id: m.Id || m.id || `hist-${index}`,
        role: (m.Role?.toLowerCase() || m.role?.toLowerCase() || 'model') as 'user' | 'model',
        content: m.Content || m.content || '',
        toolUsed: m.ToolUsed || m.toolUsed || null,
        createdAt: m.CreatedAt || m.createdAt || undefined,
      }));
      setLocalMessages(formatted);
    }
  }, [sessionData]);

  // Se a sessão expirou ou não pertence mais ao usuário (404), limpa e inicia nova
  useEffect(() => {
    if (historyError) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setSessionId(null);
      setLocalMessages([]);
    }
  }, [historyError]);

  // Mutação para envio de mensagem
  const mutation = useMutation({
    mutationFn: async (messageText: string) => {
      setErrorMessage(null);
      return await postChatMessage({
        sessionId: sessionId || undefined,
        message: messageText,
      });
    },
    onMutate: async (messageText: string) => {
      // Adiciona imediatamente a mensagem do usuário ao chat
      const userMsg: ChatMessageItem = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: messageText,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, userMsg]);
    },
    onSuccess: (data, variables) => {
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        sessionStorage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      // Adiciona a resposta do assistente
      const botMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply,
        toolUsed: data.toolUsed,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, botMsg]);

      // Atualiza cache de mensagens no TanStack Query
      if (data.sessionId) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', data.sessionId] });
      }
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error;

      if (status === 502) {
        setErrorMessage(
          'O assistente virtual está temporariamente indisponível para processar esta requisição. Por favor, tente novamente em instantes.'
        );
      } else if (apiMsg) {
        setErrorMessage(apiMsg);
      } else {
        setErrorMessage('Ocorreu um erro de conexão ao enviar sua mensagem. Verifique se o servidor está ativo.');
      }
    },
  });

  const sendMessage = (text: string) => {
    mutation.mutate(text);
  };

  const startNewSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionId(null);
    setLocalMessages([]);
    setErrorMessage(null);
  };

  return {
    sessionId,
    messages: localMessages,
    isTyping: mutation.isPending,
    isLoadingHistory,
    errorMessage,
    clearError: () => setErrorMessage(null),
    sendMessage,
    startNewSession,
  };
};
