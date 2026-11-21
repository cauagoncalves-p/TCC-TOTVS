// frontend/src/features/admin/components/CreateUserDialog.tsx
import React, { useState } from 'react';
import { UserPlus, X, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { adminUserService } from '../../../services/adminUserService';
import { UserRole, CreateUserResponse } from '../../../types/auth';

interface CreateUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: CreateUserResponse) => void;
}

export const CreateUserDialog: React.FC<CreateUserDialogProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('colaborador');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const empIdNum = parseInt(employeeId.trim(), 10);
    if (!empIdNum || empIdNum <= 0) {
      setError('Informe um ID de colaborador válido.');
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminUserService.createUser({
        employeeId: empIdNum,
        email: email.trim().toLowerCase(),
        role
      });
      // Limpa os campos
      setEmployeeId('');
      setEmail('');
      setRole('colaborador');
      onSuccess(response);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao criar usuário.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-dialog-title"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-app-surface rounded-2xl shadow-2xl border border-app-border p-6 space-y-5">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-app-bg transition-colors"
          title="Fechar"
          aria-label="Fechar diálogo"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h3 id="create-user-dialog-title" className="text-base font-bold text-brand-900">
              Novo Usuário de Acesso
            </h3>
            <p className="text-xs text-text-secondary">
              Gera credencial para um colaborador sem usuário cadastrado.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-risk-high-bg border border-risk-high/30 rounded-lg text-risk-high flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-risk-high" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <Input
              label="ID do Colaborador (EmployeeId)"
              type="number"
              placeholder="Ex: 3"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isLoading}
              required
            />
            <span className="text-[11px] text-text-secondary/80 mt-1 block">
              Identificador numérico do colaborador existente no cadastro do RH.
            </span>
          </div>

          <div>
            <Input
              label="E-mail de Login"
              type="email"
              placeholder="colaborador@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Perfil de Acesso (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="colaborador">Colaborador (Portal do Colaborador)</option>
              <option value="rh">RH (Operação, Onboarding, Compliance e Usuários)</option>
              <option value="gestor">Gestor (Analytics e Monitoramento)</option>
            </select>
          </div>

          <div className="p-3 rounded-lg bg-brand-100/60 border border-brand-300/40 text-[11px] text-brand-900">
            Uma senha temporária aleatória será gerada automaticamente e exibida na tela seguinte para entrega ao colaborador.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-app-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
            >
              Criar Usuário e Gerar Senha
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
