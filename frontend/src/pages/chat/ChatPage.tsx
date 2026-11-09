import React from 'react';
import { RefreshCw, MessageSquarePlus, Bot } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { ChatPanel } from '../../components/ui/ChatPanel';
import { DisclaimerBanner } from '../../components/ui/DisclaimerBanner';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useChat } from '../../features/chat/hooks';

const CHAT_SUGGESTIONS = [
  'Quantos dias de férias tenho?',
  'Por que veio desconto de vale-transporte?',
  'Qual é o meu salário base atual e cargo cadastrado?',
  'Como funciona o adiantamento salarial da TOTVS?',
];

export const ChatPage: React.FC = () => {
  const {
    sessionId,
    messages,
    isTyping,
    isLoadingHistory,
    errorMessage,
    clearError,
    sendMessage,
    startNewSession,
  } = useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto">
      {/* Header com Ações */}
      <PageHeader
        title="Assistente de RH"
        subtitle="Consulte saldo de férias, esclareça dúvidas sobre holerite e benefícios corporativos"
        action={
          <div className="flex items-center gap-2">
            {sessionId && (
              <Button
                variant="outline"
                size="sm"
                onClick={startNewSession}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <MessageSquarePlus className="w-4 h-4 text-primary" />
                Nova Conversa
              </Button>
            )}
          </div>
        }
      />

      {/* Banner Informativo */}
      <div className="mb-4">
        <DisclaimerBanner
          type="assistant"
          message="Este assistente consulta diretamente seus dados funcionais e a base interna de benefícios. Informações oficiais sujeitas às políticas de RH e CCT vigente."
        />
      </div>

      {/* Área Principal do Chat */}
      <div className="flex-1 min-h-0">
        {isLoadingHistory ? (
          <div className="h-full bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center space-x-3 mb-6">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-48 h-4" />
                <Skeleton className="w-32 h-3" />
              </div>
            </div>
            <Skeleton className="w-3/4 h-16 rounded-2xl ml-auto" />
            <Skeleton className="w-2/3 h-24 rounded-2xl" />
            <Skeleton className="w-1/2 h-16 rounded-2xl ml-auto" />
          </div>
        ) : (
          <ChatPanel
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            suggestions={CHAT_SUGGESTIONS}
            errorMessage={errorMessage}
            onClearError={clearError}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPage;
