import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface ReplyBoxProps {
  onSendMessage: (content: string) => Promise<boolean>;
  disabled?: boolean;
  placeholder?: string;
  reopenWarning?: string | null;
}

export const ReplyBox: React.FC<ReplyBoxProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Escreva sua resposta...',
  reopenWarning
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const trimmed = content.trim();
  const charCount = content.length;
  const isOverLimit = charCount > 2000;
  const canSubmit = trimmed.length > 0 && !isOverLimit && !disabled && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const success = await onSendMessage(content);
      if (success) {
        setContent('');
        // Retorna o foco para o textarea
        setTimeout(() => {
          textareaRef.current?.focus();
        }, 50);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
      {reopenWarning && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg font-medium">
          {reopenWarning}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg font-medium"
        >
          {errorMsg}
        </div>
      )}

      <div className="relative">
        <label htmlFor="reply-textarea" className="sr-only">
          Resposta para o chamado
        </label>
        <textarea
          id="reply-textarea"
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSubmitting}
          placeholder={placeholder}
          rows={3}
          maxLength={2100}
          className="w-full resize-y min-h-[80px] p-2.5 text-xs sm:text-sm text-slate-800 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-slate-400">
            <CornerDownLeft className="w-3 h-3" />
            <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">Enter</kbd> para enviar
          </span>
          <span
            className={
              isOverLimit
                ? 'font-bold text-red-600'
                : charCount > 1800
                ? 'font-medium text-amber-600'
                : 'text-slate-400'
            }
          >
            {charCount}/2000
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          isLoading={isSubmitting}
          className="gap-1.5 text-xs font-semibold self-end sm:self-auto"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Enviar resposta</span>
        </Button>
      </div>
    </div>
  );
};
