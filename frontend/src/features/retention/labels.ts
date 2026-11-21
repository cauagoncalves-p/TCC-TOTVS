// frontend/src/features/retention/labels.ts
import { AttentionLevel, DataQuality, TrendDirection, FollowUpActionType } from './types';

export const ATTENTION_LEVEL_LABELS: Record<AttentionLevel, string> = {
  alta: 'Atenção alta',
  moderada: 'Atenção moderada',
  baixa: 'Atenção baixa',
  insuficiente: 'Dados insuficientes',
  nao_aplicavel: 'Não aplicável'
};

export const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  completo: 'Dados completos (6 meses)',
  parcial: 'Dados parciais (3 a 5 meses)',
  insuficiente: 'Dados insuficientes (< 3 meses)'
};

export const TREND_LABELS: Record<TrendDirection, string> = {
  subindo: 'Em alta',
  estavel: 'Estável',
  caindo: 'Em queda'
};

export const FOLLOW_UP_ACTION_LABELS: Record<FollowUpActionType, string> = {
  conversa_1_1: 'Conversa individual de alinhamento e escuta (1:1)',
  revisao_carga: 'Revisão de carga horária e redistribuição de demandas',
  revisao_salarial: 'Avaliação de enquadramento ou revisão salarial',
  plano_desenvolvimento: 'Estruturação de Plano de Desenvolvimento Individual (PDI)',
  outro: 'Outra ação de suporte e retenção'
};

export const CAREER_EVENT_LABELS: Record<string, string> = {
  admissao: 'Admissão',
  reajuste: 'Reajuste Salarial',
  promocao: 'Promoção',
  mudanca_cargo: 'Mudança de Cargo'
};
