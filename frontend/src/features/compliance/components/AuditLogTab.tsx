import React from 'react';
import { History, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { ComplianceAuditLogItem, ComplianceRun } from '../../../types/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/formatters';

interface AuditLogTabProps {
  runs: ComplianceRun[];
  logs: ComplianceAuditLogItem[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  onPageChange: (newOffset: number) => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
  runs,
  logs,
  total,
  limit,
  offset,
  isLoading,
  onPageChange
}) => {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const formatActionName = (action: string) => {
    const map: Record<string, string> = {
      run_started: 'Auditoria Executada',
      issue_resolved: 'Inconsistência Corrigida',
      issue_ignored: 'Inconsistência Ignorada',
      esocial_confirmed: 'Envio eSocial Simulado'
    };
    return map[action] || action;
  };

  return (
    <div className="space-y-6">
      {/* Seção 1: Histórico de Execuções de Auditoria (GET /api/compliance/runs) */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Histórico de Execuções de Auditoria (Compliance Runs)
            </h3>
            <p className="text-xs text-slate-500">
              Ciclos de auditoria executados por escopo (cadastros ou eSocial).
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total de execuções: {runs.length}
          </span>
        </div>

        {runs.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhuma execução registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Escopo</th>
                  <th className="py-2.5 px-3">Iniciado Em</th>
                  <th className="py-2.5 px-3">Executado Por</th>
                  <th className="py-2.5 px-3">Registros Analisados</th>
                  <th className="py-2.5 px-3">Novas Inconsistências</th>
                  <th className="py-2.5 px-3">Total Abertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.Id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      #{r.Id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 capitalize">
                      {r.Scope} {r.EventCode ? `(${r.EventCode})` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(r.StartedAt)} {new Date(r.StartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3">{r.StartedByName || 'Sistema'}</td>
                    <td className="py-2.5 px-3 font-mono">{r.RecordsAnalyzed || 0}</td>
                    <td className="py-2.5 px-3 text-rose-600 font-semibold">
                      +{r.IssuesNew || 0}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      {r.IssuesOpen || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção 2: Registro de Auditoria Paginado (GET /api/compliance/audit-log) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Trilha Imutável de Auditoria (Compliance Audit Log)
            </h3>
            <p className="text-xs text-slate-500">
              Registro paginado de todas as intervenções manuais, justificativas e simulações.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Total de registros: {total}
          </span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nenhum registro de auditoria"
              description="Nenhuma ação foi auditada ainda no sistema."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                  <tr>
                    <th className="py-3 px-3.5">Data/Hora</th>
                    <th className="py-3 px-3.5">Usuário</th>
                    <th className="py-3 px-3.5">Perfil</th>
                    <th className="py-3 px-3.5">Ação Realizada</th>
                    <th className="py-3 px-3.5">Alvo / Entidade</th>
                    <th className="py-3 px-3.5">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.Id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(log.CreatedAt)} {new Date(log.CreatedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-900">
                        {log.UserName || `ID #${log.UserId}`}
                      </td>
                      <td className="py-3 px-3.5 capitalize text-slate-500">
                        {log.UserRole || '-'}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-slate-800">
                        {formatActionName(log.Action)}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600">
                        {log.EntityType ? `${log.EntityType} #${log.EntityId || ''}` : '-'}
                      </td>
                      <td
                        className="py-3 px-3.5 max-w-xs text-slate-500 font-mono text-[11px] truncate"
                        title={log.DetailsJson || ''}
                      >
                        {log.DetailsJson || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => onPageChange(Math.max(0, offset - limit))}
                  className="text-xs h-7 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + limit >= total}
                  onClick={() => onPageChange(offset + limit)}
                  className="text-xs h-7 px-2"
                >
                  Próxima
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
