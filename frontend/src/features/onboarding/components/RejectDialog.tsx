// frontend/src/features/onboarding/components/RejectDialog.tsx
import React, { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

interface RejectDialogProps {
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export const RejectDialog: React.FC<RejectDialogProps> = ({
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('O motivo da rejeição é obrigatório.');
      return;
    }
    if (trimmed.length > 300) {
      setError('O motivo deve ter no máximo 300 caracteres.');
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70">
          <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 shrink-0">
            <XCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="reject-dialog-title" className="text-base font-semibold text-slate-900">
              Rejeitar Processo de Admissão
            </h3>
            <p className="text-xs text-slate-500">
              Informe a justificativa formal para auditoria e histórico do processo.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reject-reason" className="block text-xs font-semibold text-slate-700">
                Motivo da Rejeição <span className="text-rose-600">*</span>
              </label>
              <span className={`text-[11px] font-mono ${reason.length > 300 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                {reason.length}/300
              </span>
            </div>
            <textarea
              id="reject-reason"
              rows={4}
              maxLength={300}
              value={reason}
              disabled={isLoading}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
              placeholder="Ex.: Documento com baixa resolução, CPF divergente do comprovante emitido pela Receita, ausência de assinatura..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
              aria-invalid={!!error}
              aria-describedby={error ? 'reject-error' : undefined}
            />
            {error && (
              <p id="reject-error" className="text-xs text-rose-600 mt-1 font-medium">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            Confirmar Rejeição
          </Button>
        </div>
      </div>
    </div>
  );
};
