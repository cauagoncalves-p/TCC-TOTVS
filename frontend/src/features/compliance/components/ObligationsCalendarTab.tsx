import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { ObligationItem } from '../../../types/api';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DisclaimerBanner } from '../../../components/ui/DisclaimerBanner';
import { formatDate } from '../../../lib/formatters';

const DEFAULT_OBLIGATIONS: ObligationItem[] = [
  {
    id: 'obl-1',
    code: 'FGTS-DIG',
    title: 'Recolhimento Mensal FGTS Digital',
    dueDate: '2026-11-20',
    status: 'proximo',
    responsible: 'Coordenação de DP (Ana Silva)',
    category: 'trabalhista'
  },
  {
    id: 'obl-2',
    code: 'DCTF-WEB',
    title: 'Transmissão DCTFWeb Previdenciária (INSS)',
    dueDate: '2026-11-15',
    status: 'pendente',
    responsible: 'Fiscal e DP (Carlos Mendes)',
    category: 'previdenciaria'
  },
  {
    id: 'obl-3',
    code: 'S-1299',
    title: 'Fechamento da Folha Periódica no eSocial',
    dueDate: '2026-11-15',
    status: 'proximo',
    responsible: 'Especialista eSocial (Juliana Costa)',
    category: 'trabalhista'
  },
  {
    id: 'obl-4',
    code: '13-PARC1',
    title: 'Adiantamento da 1ª Parcela do 13º Salário',
    dueDate: '2026-11-30',
    status: 'em_dia',
    responsible: 'Folha de Pagamento',
    category: 'trabalhista'
  },
  {
    id: 'obl-5',
    code: 'NR-07-ASO',
    title: 'Renovação Exames Médicos Periódicos (SESMT)',
    dueDate: '2026-10-31',
    status: 'atrasado',
    responsible: 'Medicina do Trabalho',
    category: 'trabalhista'
  },
  {
    id: 'obl-6',
    code: 'IRRF-FOLHA',
    title: 'DARF Previdenciário / IRRF sobre Rendimentos do Trabalho',
    dueDate: '2026-11-20',
    status: 'em_dia',
    responsible: 'Controladoria & Fiscal',
    category: 'fiscal'
  }
];

interface ObligationsCalendarTabProps {
  isRh: boolean;
}

export const ObligationsCalendarTab: React.FC<ObligationsCalendarTabProps> = ({ isRh }) => {
  const [obligations, setObligations] = useState<ObligationItem[]>(DEFAULT_OBLIGATIONS);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'lista' | 'grade'>('lista');

  const handleComplete = (id: string) => {
    setObligations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'concluida' } : item))
    );
  };

  const filtered = obligations.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: ObligationItem['status']) => {
    switch (status) {
      case 'em_dia':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Em dia
          </span>
        );
      case 'proximo':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Próximo do vencimento
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <AlertCircle className="w-3 h-3 text-blue-600" />
            Pendente
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Atrasado
          </span>
        );
      case 'concluida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <CheckCircle2 className="w-3 h-3 text-slate-500" />
            Concluída
          </span>
        );
    }
  };

  // Dias do mês de Novembro/2026 (1 a 30)
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);

  const getObligationsForDay = (day: number) => {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    return obligations.filter((o) => o.dueDate.endsWith(`-${dayStr}`));
  };

  return (
    <div className="space-y-4">
      <DisclaimerBanner type="obligations" />

      {/* Barra de Filtros e Alternador de Visão */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span>Novembro / 2026</span>
          </div>

          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                viewMode === 'lista'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              onClick={() => setViewMode('grade')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                viewMode === 'grade'
                  ? 'bg-white text-blue-600 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grade Mensal
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Filtrar status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="em_dia">Em dia</option>
            <option value="proximo">Próximo do vencimento</option>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="concluida">Concluída</option>
          </select>
        </div>
      </div>

      {/* Visão 1: Grade Mensal Simples */}
      {viewMode === 'grade' && (
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500 pb-2 border-b border-slate-100">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const dayObls = getObligationsForDay(day);
              const hasObl = dayObls.length > 0;

              return (
                <div
                  key={day}
                  className={`min-h-[70px] p-1.5 rounded-lg border text-xs flex flex-col justify-between ${
                    hasObl
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <span className={`font-bold ${hasObl ? 'text-blue-900' : 'text-slate-600'}`}>
                    {day}
                  </span>

                  {hasObl && (
                    <div className="space-y-1">
                      {dayObls.map((ob) => (
                        <div
                          key={ob.id}
                          className="p-1 rounded bg-white border border-slate-200 text-[10px] leading-tight"
                          title={`${ob.title} (${ob.status})`}
                        >
                          <span className="font-semibold block truncate text-slate-800">
                            {ob.code}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Visão 2: Lista Detalhada de Obrigações */}
      {viewMode === 'lista' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="p-4 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {item.code}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900 mt-1">{item.title}</h4>
                  </div>
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div>
                    <span className="font-medium text-slate-700">Vencimento: </span>
                    {formatDate(item.dueDate)}
                  </div>
                  <div>
                    <span className="font-medium text-slate-700">Responsável: </span>
                    {item.responsible}
                  </div>
                </div>
              </div>

              {isRh && item.status !== 'concluida' && (
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleComplete(item.id)}
                    className="text-xs gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Concluir Obrigação
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
