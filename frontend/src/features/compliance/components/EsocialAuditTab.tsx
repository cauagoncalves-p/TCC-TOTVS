import React, { useState } from 'react';
import { Send, Play, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { EsocialEvent, ComplianceIssue } from '../../../types/api';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { DisclaimerBanner } from '../../../components/ui/DisclaimerBanner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/formatters';

interface EsocialAuditTabProps {
  events: EsocialEvent[];
  issues: ComplianceIssue[];
  isLoading: boolean;
  isRh: boolean;
  onAuditEvents: () => void;
  isAuditing: boolean;
  onConfirmEvent: (id: number) => void;
  isConfirming: boolean;
}

export const EsocialAuditTab: React.FC<EsocialAuditTabProps> = ({
  events,
  issues,
  isLoading,
  isRh,
  onAuditEvents,
  isAuditing,
  onConfirmEvent,
  isConfirming
}) => {
  const [selectedEventToConfirm, setSelectedEventToConfirm] = useState<EsocialEvent | null>(null);

  // Mapeamento de quais colaboradores ou eventos possuem pendências de alta prioridade abertas
  const hasHighIssueForEmployee = (employeeId: number) => {
    return issues.some(
      (i) => i.EmployeeId === employeeId && i.Priority === 'alta' && i.Status === 'aberta'
    );
  };

  const handleConfirmAction = () => {
    if (!selectedEventToConfirm) return;
    onConfirmEvent(selectedEventToConfirm.Id);
    setSelectedEventToConfirm(null);
  };

  return (
    <div className="space-y-4">
      {/* Banner de Aviso Oficial */}
      <DisclaimerBanner type="esocial" />

      {/* Header com Ação de Auditoria */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Validação Pré-Envio de Eventos Periódicos e Não-Periódicos
          </h3>
          <p className="text-xs text-slate-500">
            Verifique as regras de leiaute, prazos e integridade cadastral antes da transmissão oficial.
          </p>
        </div>

        {isRh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAuditEvents}
            disabled={isAuditing}
            className="text-xs gap-1.5"
          >
            <Play className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Auditando eventos...' : 'Auditar eventos eSocial'}
          </Button>
        )}
      </div>

      {/* Tabela de Eventos */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="Nenhum evento eSocial pendente"
          description="Todos os eventos previstos estão conferidos e validados."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                <tr>
                  <th className="py-3 px-3.5">Evento</th>
                  <th className="py-3 px-3.5">Colaborador</th>
                  <th className="py-3 px-3.5">Departamento</th>
                  <th className="py-3 px-3.5">Data Evento</th>
                  <th className="py-3 px-3.5">Status Validação</th>
                  <th className="py-3 px-3.5">Consistência</th>
                  <th className="py-3 px-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev) => {
                  const hasHighIssue = hasHighIssueForEmployee(ev.EmployeeId);
                  const isSent = ev.Status === 'enviado_simulado';
                  const canConfirm = !isSent && !hasHighIssue && isRh;

                  return (
                    <tr key={ev.Id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {ev.EventCode}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">
                          {ev.EmployeeName || `Colaborador #${ev.EmployeeId}`}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Matrícula: {ev.EmployeeRegistration || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">{ev.EmployeeDepartment || '-'}</td>
                      <td className="py-3 px-3.5">{formatDate(ev.EventDate)}</td>
                      <td className="py-3 px-3.5">
                        <StatusBadge status={ev.Status} />
                      </td>
                      <td className="py-3 px-3.5">
                        {hasHighIssue ? (
                          <span className="flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                            <AlertOctagon className="w-3.5 h-3.5" />
                            Bloqueado (Inconsistência Alta)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Apto para Envio
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {isSent ? (
                          <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded">
                            Confirmado {ev.ConfirmedAt ? `(${formatDate(ev.ConfirmedAt)})` : ''}
                          </span>
                        ) : isRh ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!canConfirm || isConfirming}
                            onClick={() => setSelectedEventToConfirm(ev)}
                            className="text-xs"
                            title={
                              hasHighIssue
                                ? 'Bloqueio preventivo: corrija as inconsistências de alta prioridade deste colaborador antes de simular o envio.'
                                : 'Confirmar envio simulado'
                            }
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Confirmar Simulação
                          </Button>
                        ) : (
                          <span className="text-slate-400 text-xs">Apenas visualização</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Confirmação com ConfirmDialog */}
      <ConfirmDialog
        isOpen={Boolean(selectedEventToConfirm)}
        title="Confirmar Envio Simulado do Evento eSocial"
        description={`Você está prestes a validar e registrar o envio simulado do evento ${selectedEventToConfirm?.EventCode} para o colaborador ${selectedEventToConfirm?.EmployeeName}. 
        Atenção: Nenhuma informação é transmitida aos servidores da Receita Federal/Governo. Este procedimento realiza a auditoria interna e assegura que a obrigação foi conferida pela equipe de RH.`}
        confirmLabel="Simular Envio"
        cancelLabel="Cancelar"
        variant="primary"
        isLoading={isConfirming}
        onConfirm={handleConfirmAction}
        onCancel={() => setSelectedEventToConfirm(null)}
      />
    </div>
  );
};
