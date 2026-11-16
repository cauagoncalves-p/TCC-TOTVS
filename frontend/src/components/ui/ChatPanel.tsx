import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Wrench, FileText } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export interface ChatMessageItem {
  id: string | number;
  role: 'user' | 'model';
  content: string;
  toolUsed?: string | null;
  createdAt?: string;
  isUnconfirmed?: boolean;
  sources?: Array<{
    title: string;
    version?: string;
    section?: string;
    page?: number | null;
    publishedAt?: string;
    docType?: string;
    score?: number;
  }>;
}

interface ChatPanelProps {
  messages: ChatMessageItem[];
  isTyping?: boolean;
  onSendMessage: (message: string) => void;
  suggestions?: string[];
  onSelectSuggestion?: (suggestion: string) => void;
  disabled?: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isTyping = false,
  onSendMessage,
  suggestions = [],
  onSelectSuggestion,
  disabled = false,
  errorMessage = null,
  onClearError,
  title = 'Assistente Virtual TOTVS RH',
  subtitle = 'Tire dúvidas sobre holerite, férias, benefícios e normas internas',
  action
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > 1000 || disabled || isTyping) return;
    onSendMessage(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOverLimit = input.length > 1000;
  const isSendDisabled = !input.trim() || isOverLimit || disabled || isTyping;

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-0">
      {/* Header / Info bar compacto e responsivo */}
      <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 bg-muted/40 border-b border-border flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground truncate">{title}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-foreground mb-1">Como posso te ajudar hoje?</h4>
            <p className="text-sm max-w-md mb-6">
              Você pode perguntar sobre férias, entender descontos no seu holerite ou solicitar informações sobre sua jornada.
            </p>

            {suggestions.length > 0 && (
              <div className="w-full max-w-lg space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Perguntas frequentes
                </span>
                <div className="flex flex-col gap-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSuggestion ? onSelectSuggestion(suggestion) : onSendMessage(suggestion)}
                      className="text-left text-sm px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/70 hover:border-primary/40 text-foreground transition-all duration-150 flex items-center justify-between group"
                    >
                      <span>{suggestion}</span>
                      <Sparkles className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] break-words rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm shadow-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-muted/70 text-foreground border border-border rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                    {/* Tool Used Badge */}
                    {msg.toolUsed && (
                      <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wrench className="w-3.5 h-3.5 text-primary/80" />
                        <span>Consulta automatizada: <code className="font-semibold">{msg.toolUsed}</code></span>
                      </div>
                    )}

                    {/* Unconfirmed highlight badge */}
                    {msg.isUnconfirmed && (
                      <div className="mt-2.5 p-2 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center gap-2 text-xs text-amber-800 font-semibold">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Não confirmada na base documental vigente</span>
                      </div>
                    )}

                    {/* Document Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/60 space-y-1.5">
                        <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Fontes citadas ({msg.sources.length}):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, i) => {
                            const isInternal = src.docType === 'politica_interna';
                            return (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] bg-background/90 border border-slate-200 shadow-2xs"
                              >
                                <span
                                  className={`text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider ${
                                    isInternal
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {isInternal ? 'Política interna' : 'Fonte oficial'}
                                </span>
                                <span className="font-semibold text-slate-800">{src.title}</span>
                                {src.version && (
                                  <span className="text-slate-500">v{src.version}</span>
                                )}
                                {src.section && (
                                  <span className="text-slate-600">• {src.section}</span>
                                )}
                                {src.page && (
                                  <span className="text-slate-500">• pág. {src.page}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    {msg.createdAt && (
                      <div
                        className={`text-[10px] mt-1.5 text-right ${
                          isUser ? 'text-primary-foreground/75' : 'text-muted-foreground'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted/70 border border-border rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                  <span className="text-xs text-muted-foreground ml-2 font-medium">Digitando...</span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="text-xs underline hover:no-underline font-medium"
            >
              Fechar
            </button>
          )}
        </div>
      )}

      {/* Suggested Questions Pill bar when conversation has messages */}
      {messages.length > 0 && suggestions.length > 0 && !isTyping && (
        <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs shrink-0">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium shrink-0">Sugestões:</span>
          {suggestions.map((sug, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectSuggestion ? onSelectSuggestion(sug) : onSendMessage(sug)}
              className="shrink-0 px-2.5 py-0.5 rounded-full border border-border bg-background hover:bg-muted text-foreground transition-colors text-[11px] whitespace-nowrap"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Input Area Compacta */}
      <div className="p-2.5 sm:p-3.5 border-t border-border bg-background shrink-0">
        <div className="relative flex items-center">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isTyping}
            placeholder="Digite sua dúvida sobre RH..."
            rows={1}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 pr-20 sm:pr-24 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input disabled:cursor-not-allowed disabled:opacity-50 min-h-[42px] max-h-24 leading-normal"
          />
          <div className="absolute right-2 bottom-1.5 sm:bottom-2 flex items-center gap-1.5">
            <span
              className={`text-[10px] sm:text-xs ${
                isOverLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'
              }`}
            >
              {input.length > 700 ? `${input.length}/1000` : ''}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={isSendDisabled}
              onClick={handleSend}
              className="h-8 w-8 sm:h-8 sm:w-8 p-0 min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
              title="Enviar mensagem"
              aria-label="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {isOverLimit && (
          <p className="text-xs text-destructive mt-1 font-medium">
            Mensagens não podem ultrapassar 1000 caracteres.
          </p>
        )}
      </div>
    </div>
  );
};
