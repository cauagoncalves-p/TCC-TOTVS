import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { VisibilityNotice } from '../../features/tickets/components/VisibilityNotice';
import { CATEGORIES_LIST } from '../../features/tickets/labels';
import { TicketCategory } from '../../features/tickets/types';
import { useCreateTicket } from '../../features/tickets/hooks';

export const NewTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const createTicketMutation = useCreateTicket();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('ferias');
  const [message, setMessage] = useState('');

  // Erros por campo e geral
  const [fieldErrors, setFieldErrors] = useState<{
    subject?: string;
    category?: string;
    message?: string;
  }>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isRateLimit, setIsRateLimit] = useState<boolean>(false);

  const isDirty = subject.trim().length > 0 || message.trim().length > 0;

  // Aviso de alterações não salvas ao fechar aba
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    const trimmedSubject = subject.trim();
    if (!trimmedSubject) {
      errors.subject = 'O assunto é obrigatório.';
    } else if (trimmedSubject.length < 5) {
      errors.subject = 'O assunto deve ter pelo menos 5 caracteres.';
    } else if (trimmedSubject.length > 150) {
      errors.subject = 'O assunto não pode exceder 150 caracteres.';
    }

    if (!category) {
      errors.category = 'Selecione uma categoria.';
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      errors.message = 'A mensagem é obrigatória.';
    } else if (trimmedMessage.length < 10) {
      errors.message = 'A mensagem deve conter pelo menos 10 caracteres.';
    } else if (trimmedMessage.length > 2000) {
      errors.message = 'A mensagem não pode exceder 2000 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setIsRateLimit(false);

    if (!validate()) {
      return;
    }

    try {
      const createdTicket = await createTicketMutation.mutateAsync({
        subject: subject.trim(),
        category,
        message: message.trim()
      });

      // Navega para a tela de detalhe com mensagem de sucesso
      navigate(`/chamados/${createdTicket.id}`, {
        state: {
          successMessage: `Chamado #${createdTicket.id} aberto. Avisamos você quando o RH responder.`
        }
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const apiMessage = err?.response?.data?.message || err?.message || 'Falha ao abrir chamado.';

      if (status === 429) {
        setIsRateLimit(true);
        setGlobalError(apiMessage);
      } else if (status === 400 && err?.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      } else {
        setGlobalError(apiMessage);
      }
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'Você tem alterações não salvas no formulário. Deseja realmente sair?'
      );
      if (!confirmLeave) return;
    }
    navigate('/chamados');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Voltar para Meus chamados"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title="Novo Chamado"
          subtitle="Abra uma solicitação ou tire dúvidas com a equipe de Recursos Humanos."
        />
      </div>

      {/* Avisos de privacidade e minimização */}
      <VisibilityNotice />

      {/* Alerta de Erro de Rate Limit (429) ou Erro Geral */}
      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-2 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Não foi possível abrir o chamado</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{globalError}</p>
            </div>
          </div>
          {isRateLimit && (
            <div className="pt-2 border-t border-red-200/60 pl-7">
              <Link
                to="/chamados"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Ver meus chamados em aberto →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        {/* Assunto */}
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-subject"
            className="block text-xs font-semibold text-slate-800"
          >
            Assunto <span className="text-red-500">*</span>
          </label>
          <input
            id="ticket-subject"
            type="text"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (fieldErrors.subject) setFieldErrors((prev) => ({ ...prev, subject: undefined }));
            }}
            placeholder="Ex.: Dúvida sobre período aquisitivo de férias"
            maxLength={150}
            aria-invalid={Boolean(fieldErrors.subject)}
            aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
            <span>5 a 150 caracteres</span>
            <span>{subject.length}/150</span>
          </div>
          {fieldErrors.subject && (
            <p id="subject-error" className="text-xs text-red-600 font-medium">
              {fieldErrors.subject}
            </p>
          )}
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-category"
            className="block text-xs font-semibold text-slate-800"
          >
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            id="ticket-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TicketCategory);
              if (fieldErrors.category) setFieldErrors((prev) => ({ ...prev, category: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.category)}
            aria-describedby={fieldErrors.category ? 'category-error' : undefined}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          >
            {CATEGORIES_LIST.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          {fieldErrors.category && (
            <p id="category-error" className="text-xs text-red-600 font-medium">
              {fieldErrors.category}
            </p>
          )}
        </div>

        {/* Mensagem Inicial */}
        <div className="space-y-1.5">
          <label
            htmlFor="ticket-message"
            className="block text-xs font-semibold text-slate-800"
          >
            Mensagem <span className="text-red-500">*</span>
          </label>
          <textarea
            id="ticket-message"
            rows={5}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (fieldErrors.message) setFieldErrors((prev) => ({ ...prev, message: undefined }));
            }}
            placeholder="Descreva detalhadamente sua dúvida ou solicitação (mínimo de 10 caracteres)..."
            maxLength={2000}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? 'message-error' : undefined}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
            <span>10 a 2000 caracteres</span>
            <span
              className={
                message.length > 2000
                  ? 'font-bold text-red-600'
                  : message.length > 1800
                  ? 'text-amber-600'
                  : 'text-slate-400'
              }
            >
              {message.length}/2000
            </span>
          </div>
          {fieldErrors.message && (
            <p id="message-error" className="text-xs text-red-600 font-medium">
              {fieldErrors.message}
            </p>
          )}
        </div>

        {/* Ações do formulário */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={createTicketMutation.isPending}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={createTicketMutation.isPending}
            disabled={createTicketMutation.isPending}
            className="gap-2 text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Abrir chamado</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
