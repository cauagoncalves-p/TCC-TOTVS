import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LifeBuoy, ChevronRight, ChevronLeft, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { TicketStatusBadge } from '../../features/tickets/components/TicketStatusBadge';
import { CategoryChip } from '../../features/tickets/components/CategoryChip';
import { useMyTickets } from '../../features/tickets/hooks';
import { TicketStatus } from '../../features/tickets/types';
import { formatRelativeTime, formatFullDateTime } from '../../features/tickets/utils/ticketUtils';
import { cn } from '../../lib/utils';

type FilterTab = 'todos' | 'aberto' | 'respondido' | 'resolvido';

export const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<FilterTab>('todos');
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const statusParam: TicketStatus | undefined =
    selectedTab === 'todos' ? undefined : (selectedTab as TicketStatus);

  const { data, isLoading, isError, error, refetch } = useMyTickets({
    status: statusParam,
    page,
    limit
  });

  const tickets = data?.tickets || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;

  const handleTabChange = (tab: FilterTab) => {
    setSelectedTab(tab);
    setPage(1);
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'aberto', label: 'Aguardando o RH' },
    { id: 'respondido', label: 'Respondidos' },
    { id: 'resolvido', label: 'Resolvidos' }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Meus Chamados"
        subtitle="Acompanhe o andamento de suas solicitações e tire dúvidas diretamente com a equipe de RH."
        action={
          <Button
            onClick={() => navigate('/chamados/novo')}
            className="gap-2 font-semibold text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo chamado</span>
          </Button>
        }
      />

      {/* Tabs de Filtro de Estado */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 sm:gap-2 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-3.5 py-2 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors focus:outline-hidden',
                isActive
                  ? 'border-brand-500 text-brand-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo: Loading, Erro, Vazio ou Lista */}
      {isLoading ? (
        <div className="space-y-3 py-6" aria-busy="true" aria-label="Carregando chamados">
          <div className="h-12 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-16 bg-slate-200/60 rounded-xl animate-pulse" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Não foi possível carregar seus chamados"
          message={error?.message || 'Ocorreu uma falha ao comunicar com o servidor.'}
          onRetry={() => refetch()}
        />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="w-6 h-6 text-brand-500" />}
          title="Você ainda não abriu chamados"
          description="Precisa de ajuda do RH para esclarecer dúvidas sobre férias, holerite, ponto ou benefícios?"
          action={
            <Button
              onClick={() => navigate('/chamados/novo')}
              size="sm"
              className="gap-2 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Abrir novo chamado</span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Tabela para Desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse" aria-label="Tabela de chamados do colaborador">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="px-4 py-3 w-16">#</th>
                  <th scope="col" className="px-4 py-3">Assunto</th>
                  <th scope="col" className="px-4 py-3 w-32">Categoria</th>
                  <th scope="col" className="px-4 py-3 w-44">Estado</th>
                  <th scope="col" className="px-4 py-3 w-36">Última Atividade</th>
                  <th scope="col" className="px-4 py-3 w-28 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {tickets.map((t) => {
                  const isAnswered = t.status === 'respondido';
                  const relativeTime = formatRelativeTime(t.updatedAt || t.createdAt);
                  const fullDate = formatFullDateTime(t.updatedAt || t.createdAt);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/chamados/${t.id}`)}
                      className={cn(
                        'hover:bg-slate-50/80 transition-colors cursor-pointer group',
                        isAnswered && 'bg-emerald-50/30'
                      )}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-500">
                        #{t.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 group-hover:text-brand-700 transition-colors line-clamp-1">
                            {t.subject}
                          </span>
                          {isAnswered && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Nova resposta do RH
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CategoryChip category={t.category} />
                      </td>
                      <td className="px-4 py-3">
                        <TicketStatusBadge status={t.status} role="colaborador" />
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <time dateTime={t.updatedAt || t.createdAt} title={fullDate}>
                          {relativeTime}
                        </time>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-brand-600 hover:text-brand-800 p-1.5 h-auto text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chamados/${t.id}`);
                          }}
                          aria-label={`Ver chamado #${t.id}`}
                        >
                          <span>Ver</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards para Mobile */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {tickets.map((t) => {
              const isAnswered = t.status === 'respondido';
              const relativeTime = formatRelativeTime(t.updatedAt || t.createdAt);
              const fullDate = formatFullDateTime(t.updatedAt || t.createdAt);

              return (
                <div
                  key={t.id}
                  onClick={() => navigate(`/chamados/${t.id}`)}
                  className={cn(
                    'p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3 active:scale-[0.99] transition-transform cursor-pointer',
                    isAnswered && 'border-emerald-300 bg-emerald-50/20'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{t.id}</span>
                    <TicketStatusBadge status={t.status} role="colaborador" />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {t.subject}
                    </h3>
                    {isAnswered && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Nova resposta do RH
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <CategoryChip category={t.category} />
                    <time dateTime={t.updatedAt || t.createdAt} title={fullDate} className="text-[11px]">
                      {relativeTime}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Página {currentPage} de {totalPages} ({total} chamados)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage <= 1}
                  className="p-1.5 h-auto text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 h-auto text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
