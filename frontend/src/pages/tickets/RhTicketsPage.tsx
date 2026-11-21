import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Clock, AlertTriangle, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useAllTickets, useTicketCounts } from '../../features/tickets/hooks';
import { RhTicketsFilter, TicketStatus, TicketCategory } from '../../features/tickets/types';
import { TicketStatusBadge } from '../../features/tickets/components/TicketStatusBadge';
import { CategoryChip } from '../../features/tickets/components/CategoryChip';
import { formatRelativeTime } from '../../features/tickets/utils/ticketUtils';
import { cn } from '../../lib/utils';

type TabKey = 'abertos' | 'meus' | 'respondidos' | 'resolvidos' | 'todos';

interface TabDef {
  key: TabKey;
  label: string;
  filters: Partial<RhTicketsFilter>;
  emptyMsg: string;
}

const TABS: TabDef[] = [
  {
    key: 'abertos',
    label: 'Abertos sem responsável',
    filters: { status: 'aberto' as TicketStatus, assigned: 'none' },
    emptyMsg: 'Nenhum chamado aguardando o RH. Bom trabalho!'
  },
  {
    key: 'meus',
    label: 'Meus chamados',
    filters: { assigned: 'me' },
    emptyMsg: 'Nenhum chamado atribuído a você.'
  },
  {
    key: 'respondidos',
    label: 'Respondidos',
    filters: { status: 'respondido' as TicketStatus },
    emptyMsg: 'Nenhum chamado respondido no momento.'
  },
  {
    key: 'resolvidos',
    label: 'Resolvidos',
    filters: { status: 'resolvido' as TicketStatus },
    emptyMsg: 'Nenhum chamado resolvido.'
  },
  {
    key: 'todos',
    label: 'Todos',
    filters: {},
    emptyMsg: 'Nenhum chamado encontrado.'
  }
];

const CATEGORIES: { value: TicketCategory | ''; label: string }[] = [
  { value: '', label: 'Todas categorias' },
  { value: 'ferias', label: 'Férias' },
  { value: 'holerite', label: 'Holerite' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'ponto', label: 'Ponto' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'politicas', label: 'Políticas' },
  { value: 'outros', label: 'Outros' }
];

function WaitingTime({ createdAt }: { createdAt: string }) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / 3_600_000;
  if (hours < 24) return <span className="text-slate-500 text-xs">{Math.round(hours)}h</span>;
  if (hours < 72) {
    return (
      <span className="flex items-center gap-1 text-amber-600 text-xs font-medium" aria-label={`Aguardando há ${Math.round(hours)} horas`}>
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {Math.round(hours)}h
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-red-600 text-xs font-bold" aria-label={`Aguardando há ${Math.round(hours)} horas — urgente`}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {Math.round(hours)}h
    </span>
  );
}

export const RhTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const aba = (searchParams.get('aba') as TabKey) || 'abertos';
  const tab = TABS.find(t => t.key === aba) ?? TABS[0];

  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); }, [aba, category, debouncedSearch]);

  const filters: RhTicketsFilter = {
    ...tab.filters,
    ...(category ? { category } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    page,
    limit: 20
  };

  const { data, isLoading, isError } = useAllTickets(filters);
  const { data: counts } = useTicketCounts();

  const setTab = (key: TabKey) => {
    setSearchParams({ aba: key });
    setPage(1);
  };

  const isAbertos = aba === 'abertos';

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Chamados</h1>
          <p className="text-sm text-slate-500 mt-0.5">Fila de atendimento do RH</p>
        </div>
        {counts && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
              {counts.openUnassigned} sem responsável
            </span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
              {counts.assignedToMe} meus
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-slate-200" role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={aba === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-2 text-xs font-medium rounded-t whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500',
              aba === t.key
                ? 'text-brand-700 border-b-2 border-brand-600 bg-brand-50/60'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar por assunto ou colaborador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Buscar chamados"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <select
            value={category}
            onChange={e => setCategory(e.target.value as TicketCategory | '')}
            aria-label="Filtrar por categoria"
            className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white appearance-none"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="text-center py-12 text-red-600 text-sm">
          Erro ao carregar chamados.{' '}
          <button onClick={() => window.location.reload()} className="underline">
            Tentar novamente
          </button>
        </div>
      ) : !data?.tickets.length ? (
        <div className="text-center py-16 text-slate-500 text-sm">{tab.emptyMsg}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" aria-label="Lista de chamados">
            <caption className="sr-only">Chamados — aba {tab.label}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 w-12">#</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600">Assunto</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Colaborador</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">Categoria</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600">Estado</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 hidden lg:table-cell">Responsável</th>
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 hidden md:table-cell">Última ativ.</th>
                {isAbertos && <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600">Aguardando</th>}
                <th scope="col" className="px-3 py-2.5 text-xs font-semibold text-slate-600 sr-only">Ação</th>
              </tr>
            </thead>
            <tbody>
              {data.tickets.map(ticket => (
                <tr
                  key={ticket.id}
                  className="border-b border-slate-100 hover:bg-brand-50/40 cursor-pointer transition-colors"
                  onClick={() => navigate(`/rh/chamados/${ticket.id}`)}
                >
                  <td className="px-3 py-3 text-xs text-slate-400 font-mono">#{ticket.id}</td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-800 line-clamp-1">{ticket.subject}</span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-700 font-medium block">{ticket.requesterName || '—'}</span>
                    {ticket.requesterDepartment && (
                      <span className="text-xs text-slate-400">{ticket.requesterDepartment}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <CategoryChip category={ticket.category} />
                  </td>
                  <td className="px-3 py-3">
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell text-xs text-slate-600">
                    {ticket.assignedToName || <span className="text-slate-400 italic">Sem responsável</span>}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-xs text-slate-500">
                    {formatRelativeTime(ticket.lastMessageAt || ticket.updatedAt)}
                  </td>
                  {isAbertos && (
                    <td className="px-3 py-3">
                      <WaitingTime createdAt={ticket.createdAt} />
                    </td>
                  )}
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); navigate(`/rh/chamados/${ticket.id}`); }}
                      className="text-xs text-brand-600 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-600">
          <span>{data.total} resultado{data.total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Página anterior"
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Página {page} de {data.totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              aria-label="Próxima página"
              className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
