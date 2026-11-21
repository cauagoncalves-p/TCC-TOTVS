// frontend/src/features/admin/components/ChangeRoleDialog.tsx
import React, { useState } from 'react';
import { Shield, X, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { adminUserService } from '../../../services/adminUserService';
import { AdminUserItem, UserRole } from '../../../types/auth';

interface ChangeRoleDialogProps {
  isOpen: boolean;
  user: AdminUserItem | null;
  currentAdminId?: number;
  onClose: () => void;
  onSuccess: (updatedUser: AdminUserItem) => void;
}

export const ChangeRoleDialog: React.FC<ChangeRoleDialogProps> = ({
  isOpen,
  user,
  currentAdminId,
  onClose,
  onSuccess
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user?.role || 'colaborador');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isSelf = currentAdminId !== undefined && user.id === currentAdminId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelf && selectedRole !== user.role) {
      setError('Não é permitido alterar o próprio perfil de acesso.');
      return;
    }

    if (selectedRole === user.role) {
      onClose();
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await adminUserService.updateUser(user.id, { role: selectedRole });
      onSuccess(response.user);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao alterar perfil.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-role-dialog-title"
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
            <Shield className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h3 id="change-role-dialog-title" className="text-base font-bold text-brand-900">
              Alterar Perfil de Acesso
            </h3>
            <p className="text-xs text-text-secondary">
              Defina o nível de permissões de <strong className="text-text-primary">{user.email}</strong>.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-risk-high-bg border border-risk-high/30 rounded-lg text-risk-high flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-risk-high" />
            <span>{error}</span>
          </div>
        )}

        {isSelf && (
          <div className="p-3 text-xs bg-risk-moderate-bg border border-risk-moderate/40 rounded-lg text-risk-moderate flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-risk-moderate" />
            <span>Você não pode alterar seu próprio perfil de acesso por motivos de conformidade.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Novo Perfil
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              disabled={isLoading || isSelf}
              className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="colaborador">Colaborador (Portal do Colaborador)</option>
              <option value="rh">RH (Operação, Onboarding, Compliance e Usuários)</option>
              <option value="gestor">Gestor (Analytics e Monitoramento)</option>
            </select>
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
              disabled={isSelf}
            >
              Salvar Perfil
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
