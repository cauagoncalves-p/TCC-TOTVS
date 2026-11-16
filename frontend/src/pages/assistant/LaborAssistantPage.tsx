import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { ChatPanel, ChatMessageItem } from '../../components/ui/ChatPanel';
import { http } from '../../services/http';

const SUGGESTIONS = [
  'Qual o prazo legal para pagamento das verbas rescisórias na CLT?',
  'Como funciona o regime de compensação de horas e banco de horas?',
  'Qual o prazo de envio do evento S-2230 de afastamento no eSocial?',
  'Quais as regras para fracionamento de férias na política interna?'
];

export const LaborAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSendMessage = async (text: string) => {
    setErrorMessage(null);
    const userMsg: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Consulta real do Assistente Trabalhista via RAG no backend
      const response = await http.post<{
        reply: string;
        sources?: Array<{
          title: string;
          docType?: string;
          version?: string;
          section?: string;
          page?: number | null;
          publishedAt?: string;
          score?: number;
        }>;
        nao_confirmada?: boolean;
      }>('/api/compliance/assistant/chat', { message: text });

      const botMsg: ChatMessageItem = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: response.data.reply,
        sources: response.data.sources || [],
        isUnconfirmed: response.data.nao_confirmada || false,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Erro na consulta do Assistente Trabalhista:', err);
      const apiError =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Falha ao conectar com o Assistente Trabalhista. Verifique sua conexão e tente novamente.';
      
      setErrorMessage(apiError);

      const errorMsg: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Ocorreu um erro ao processar sua pergunta: ${apiError}`,
        isUnconfirmed: true,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-6.5rem)] min-h-0">
      <div className="hidden sm:block mb-3">
        <PageHeader
          title="Assistente Trabalhista (RAG)"
          subtitle="Consultas especializadas com citação estrita de fontes documentais oficiais (Fase F4c)."
        />
        {/* Aviso fixo obrigatório em desktop */}
        <DisclaimerBanner type="assistant" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <ChatPanel
          messages={messages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          suggestions={SUGGESTIONS}
          onSelectSuggestion={handleSendMessage}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
          title="Assistente Trabalhista (RAG)"
          subtitle="Consultas com citação estrita de fontes oficiais"
        />
      </div>
    </div>
  );
};
