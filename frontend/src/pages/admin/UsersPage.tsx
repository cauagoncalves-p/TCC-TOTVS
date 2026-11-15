// frontend/src/pages/admin/UsersPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  CheckCircle2,
  XCircle,
  Briefcase,
  User as UserIcon,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { adminUserService } from '../../services/adminUserService';
import { authService } from '../../services/authService';
import { AdminUserItem, UserRole, CreateUserResponse } from '../../types/auth';
import { formatDate } from '../../lib/formatters';
import { CreateUserDialog } from '../../features/admin/components/CreateUserDialog';
import { ChangeRoleDialog } from '../../features/admin/components/ChangeRoleDialog';
import { UserCredentialsDialog } from '../../features/admin/components/UserCredentialsDialog';

export const UsersPage: React.FC = () => {
  const currentUser = authService.getUser();

  // Estados de consulta e lista
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modais e diálogos
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<AdminUserItem | null>(null);

  // Credencial temporária mantida ESTRITAMENTE EM MEMÓRIA
  const [tempCredentials, setTempCredentials] = useState<{
    email: string;
    tempPassword: string;
    title: string;
    description: string;
  } | null>(null);

  // Diálogo de confirmação de Ativar / Inativar
  const [statusConfirmUser, setStatusConfirmUser] = useState<AdminUserItem | null>(null);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Diálogo de confirmação de Redefinir Senha
  const [resetConfirmUser, setResetConfirmUser] = useState<AdminUserItem | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminUserService.listUsers({
        search: searchTerm,
        role: roleFilter || undefined,
        active: activeFilter || undefined,
        page,
        limit: 15
      });
      setUsers(response.users);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao carregar lista de usuários.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter, activeFilter, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Limpa feedback de ação após 5 segundos
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Ações
  const handleToggleStatusConfirm = async () => {
    if (!statusConfirmUser) return;
    setIsStatusSubmitting(true);
    const newStatus = !statusConfirmUser.isActive;

    try {
      await adminUserService.updateUser(statusConfirmUser.id, { isActive: newStatus });
      setActionFeedback({
        type: 'success',
        message: `Usuário ${statusConfirmUser.email} ${newStatus ? 'ativado' : 'inativado'} com sucesso.`
      });
      setStatusConfirmUser(null);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao alterar status do usuário.';
      setActionFeedback({ type: 'error', message: msg });
      setStatusConfirmUser(null);
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const handleResetPasswordConfirm = async () => {
    if (!resetConfirmUser) return;
    setIsResetSubmitting(true);

    try {
      const res = await adminUserService.resetPassword(resetConfirmUser.id);
      setResetConfirmUser(null);
      fetchUsers();

      // Exibe a credencial temporária em memória
      setTempCredentials({
        email: resetConfirmUser.email,
        tempPassword: res.tempPassword,
        title: 'Senha Redefinida com Sucesso',
        description: `Uma nova senha temporária foi gerada para ${resetConfirmUser.email}.`
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Erro ao redefinir senha do usuário.';
      setActionFeedback({ type: 'error', message: msg });
      setResetConfirmUser(null);
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleCreateSuccess = (result: CreateUserResponse) => {
    setIsCreateOpen(false);
    fetchUsers();

    // Exibe credencial em memória
    setTempCredentials({
      email: result.user.email,
      tempPassword: result.tempPassword,
      title: 'Usuário Criado com Sucesso',
      description: `Conta criada para o colaborador ID #${result.user.employeeId}.`
    });
  };

  const handleRoleSuccess = (updatedUser: AdminUserItem) => {
    setRoleUser(null);
    setActionFeedback({
      type: 'success',
      message: `Perfil do usuário ${updatedUser.email} atualizado para ${updatedUser.role.toUpperCase()}.`
    });
    fetchUsers();
  };

  // Selo de Perfil
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'rh':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-900 border border-brand-300/60">
            <Shield className="w-3 h-3 text-brand-500" />
            <span>RH</span>
          </span>
        );
      case 'gestor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-risk-moderate-bg text-risk-moderate border border-risk-moderate/40">
            <Briefcase className="w-3 h-3 text-risk-moderate" />
            <span>Gestor</span>
          </span>
        );
      case 'colaborador':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-app-bg text-text-secondary border border-app-border">
            <UserIcon className="w-3 h-3 text-text-secondary" />
            <span>Colaborador</span>
          </span>
        );
    }
  };

  // Selo de Status
  const renderStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-risk-low-bg text-risk-low border border-risk-low/40">
          <CheckCircle2 className="w-3 h-3 text-risk-low" />
          <span>Ativo</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-risk-high-bg text-risk-high border border-risk-high/40">
        <XCircle className="w-3 h-3 text-risk-high" />
        <span>Inativo</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Administração de Usuários e Perfis"
        subtitle="Controle centralizado de credenciais de acesso, perfis funcionais e status operacional dos colaboradores."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-1.5 shadow-sm shadow-brand-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        }
      />

      {/* Banner de Feedback de Ação */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-150 ${
            actionFeedback.type === 'success'
              ? 'bg-risk-low-bg border-risk-low/40 text-risk-low'
              : 'bg-risk-high-bg border-risk-high/40 text-risk-high'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-risk-low" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-risk-high" />
            )}
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[11px] font-bold hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <Card className="p-4 bg-app-surface border border-app-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Campo de Busca */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou matrícula..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-app-border bg-app-surface text-text-primary placeholder:text-text-secondary focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Filtro de Perfil */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="">Todos os perfis</option>
              <option value="colaborador">Colaborador</option>
              <option value="rh">RH</option>
              <option value="gestor">Gestor</option>
            </select>
          </div>

          {/* Filtro de Status */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-app-border bg-app-surface text-text-primary focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            >
              <option value="">Todos os status</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
        </div>

        {/* Resumo de Filtros Ativos */}
        {(searchTerm || roleFilter || activeFilter) && (
          <div className="flex items-center justify-between pt-2 border-t border-app-border text-xs text-text-secondary">
            <span>
              Filtrando resultados ({total} {total === 1 ? 'usuário encontrado' : 'usuários encontrados'})
            </span>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('');
                setActiveFilter('');
                setPage(1);
              }}
              className="text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar filtros</span>
            </button>
          </div>
        )}
      </Card>

      {/* Conteúdo Principal: Tabela / Carregando / Erro / Vazio */}
      {isLoading ? (
        <Card className="p-4 bg-app-surface border border-app-border space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : error ? (
        <ErrorState
          title="Erro ao carregar usuários"
          message={error}
          onRetry={fetchUsers}
        />
      ) : users.length === 0 ? (
        <EmptyState
          title="Nenhum usuário encontrado"
          description={
            searchTerm || roleFilter || activeFilter
              ? 'Nenhum usuário corresponde aos critérios de pesquisa aplicados.'
              : 'Não há usuários cadastrados no momento.'
          }
          icon={<Users className="w-6 h-6 text-text-secondary" />}
          action={
            searchTerm || roleFilter || activeFilter ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setActiveFilter('');
                  setPage(1);
                }}
              >
                Limpar Filtros
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
              >
                Criar Primeiro Usuário
              </Button>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden bg-app-surface border border-app-border shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-app-bg text-text-secondary border-b border-app-border uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3 px-4">Usuário / Colaborador</th>
                  <th className="py-3 px-4">Perfil</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Troca de Senha</th>
                  <th className="py-3 px-4">Último Login</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/70 text-text-primary">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-app-bg/50 transition-colors"
                    >
                      {/* Usuário e Colaborador Vinculado */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-900 flex items-center justify-center font-bold text-xs shrink-0">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary block font-mono">
                                {u.email}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20">
                                  Você
                                </span>
                              )}
                            </div>
                            {u.employee ? (
                              <span className="text-[11px] text-text-secondary block mt-0.5">
                                {u.employee.fullName} • Matrícula {u.employee.registration} ({u.employee.department})
                              </span>
                            ) : (
                              <span className="text-[10px] text-text-secondary/70 italic block mt-0.5">
                                Sem colaborador vinculado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Perfil */}
                      <td className="py-3 px-4">
                        {renderRoleBadge(u.role)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {renderStatusBadge(u.isActive)}
                      </td>

                      {/* Troca de Senha */}
                      <td className="py-3 px-4">
                        {u.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-moderate">
                            <Clock className="w-3.5 h-3.5 text-risk-moderate shrink-0" />
                            <span>Pendente no próximo acesso</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
                            <CheckCircle2 className="w-3.5 h-3.5 text-risk-low shrink-0" />
                            <span>Em dia</span>
                          </span>
                        )}
                      </td>

                      {/* Último Login */}
                      <td className="py-3 px-4 text-text-secondary text-[11px]">
                        {u.lastLoginAt ? (
                          formatDate(u.lastLoginAt)
                        ) : (
                          <span className="italic text-text-secondary/60">Nunca acessou</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Alterar Perfil */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRoleUser(u)}
                            className="h-8 px-2 text-xs text-brand-700 hover:text-brand-900 hover:bg-brand-100 gap-1"
                            title="Alterar perfil de acesso"
                            disabled={isSelf}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Perfil</span>
                          </Button>

                          {/* Redefinir Senha */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetConfirmUser(u)}
                            className="h-8 px-2 text-xs text-text-secondary hover:text-brand-700 hover:bg-brand-100 gap-1"
                            title="Gerar nova senha temporária"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Resetar</span>
                          </Button>

                          {/* Ativar / Inativar */}
                          {u.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatusConfirmUser(u)}
                              disabled={isSelf}
                              className="h-8 px-2 text-xs text-risk-high hover:text-rose-700 hover:bg-risk-high-bg gap-1"
                              title={isSelf ? 'Você não pode inativar seu próprio usuário' : 'Inativar usuário'}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Inativar</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStatusConfirmUser(u)}
                              className="h-8 px-2 text-xs text-risk-low hover:text-emerald-700 hover:bg-risk-low-bg gap-1"
                              title="Reativar usuário"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Ativar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="p-3 bg-app-bg border-t border-app-border flex items-center justify-between text-xs text-text-secondary">
            <span>
              Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({total} {total === 1 ? 'usuário' : 'usuários'})
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Diálogo de Criar Usuário */}
      <CreateUserDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Diálogo de Alterar Perfil */}
      <ChangeRoleDialog
        isOpen={Boolean(roleUser)}
        user={roleUser}
        currentAdminId={currentUser?.id}
        onClose={() => setRoleUser(null)}
        onSuccess={handleRoleSuccess}
      />

      {/* Diálogo de Confirmação: Ativar / Inativar */}
      <ConfirmDialog
        isOpen={Boolean(statusConfirmUser)}
        title={statusConfirmUser?.isActive ? 'Inativar Usuário' : 'Reativar Usuário'}
        description={
          statusConfirmUser?.isActive
            ? `Tem certeza que deseja inativar o usuário "${statusConfirmUser?.email}"? O usuário perderá o acesso imediato à plataforma.`
            : `Deseja reativar o usuário "${statusConfirmUser?.email}"? Ele poderá voltar a efetuar login normalmente.`
        }
        confirmLabel={statusConfirmUser?.isActive ? 'Sim, Inativar' : 'Sim, Reativar'}
        variant={statusConfirmUser?.isActive ? 'danger' : 'primary'}
        isLoading={isStatusSubmitting}
        onConfirm={handleToggleStatusConfirm}
        onCancel={() => setStatusConfirmUser(null)}
      />

      {/* Diálogo de Confirmação: Redefinir Senha */}
      <ConfirmDialog
        isOpen={Boolean(resetConfirmUser)}
        title="Redefinir Senha do Usuário"
        description={`Deseja gerar uma nova senha temporária para "${resetConfirmUser?.email}"? A senha atual deixará de funcionar e a nova senha será exibida uma única vez na tela seguinte.`}
        confirmLabel="Sim, Gerar Nova Senha"
        variant="primary"
        isLoading={isResetSubmitting}
        onConfirm={handleResetPasswordConfirm}
        onCancel={() => setResetConfirmUser(null)}
      />

      {/* Diálogo de Credencial Temporária (mostrada apenas em memória) */}
      <UserCredentialsDialog
        isOpen={Boolean(tempCredentials)}
        title={tempCredentials?.title}
        description={tempCredentials?.description}
        userEmail={tempCredentials?.email}
        tempPassword={tempCredentials?.tempPassword}
        onClose={() => setTempCredentials(null)}
      />
    </div>
  );
};
