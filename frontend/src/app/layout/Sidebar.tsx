import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquare,
  User,
  UserPlus,
  TrendingUp,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Sparkles,
  Users,
  LifeBuoy,
  X
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/auth';
import { notificationStore } from '../../features/compliance/notifications';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
  /** Texto do selo estático (ex.: 'IA', 'RAG') */
  badge?: string;
  /** Texto acessível do selo, lido pelo leitor de tela */
  badgeA11y?: string;
}

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  // Colaborador
  {
    label: 'Assistente RH',
    to: '/chat',
    icon: <MessageSquare className="w-4 h-4" aria-hidden="true" />,
    roles: ['colaborador']
  },
  {
    label: 'Meus Chamados',
    to: '/chamados',
    icon: <LifeBuoy className="w-4 h-4" aria-hidden="true" />,
    roles: ['colaborador']
  },
  {
    label: 'Meu Perfil',
    to: '/me',
    icon: <User className="w-4 h-4" aria-hidden="true" />,
    roles: ['colaborador']
  },

  // RH
  {
    label: 'Chamados',
    to: '/rh/chamados',
    icon: <LifeBuoy className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh']
  },
  {
    label: 'Onboarding com IA',
    to: '/onboarding',
    icon: <UserPlus className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh'],
    badge: 'IA',
    badgeA11y: 'IA: usa inteligência artificial'
  },
  {
    label: 'Inteligência Preditiva',
    to: '/analytics',
    icon: <TrendingUp className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Compliance Inteligente',
    to: '/compliance',
    icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Base de Conhecimento',
    to: '/knowledge',
    icon: <BookOpen className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Assistente Trabalhista',
    to: '/assistant',
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh', 'gestor'],
    badge: 'RAG',
    badgeA11y: 'RAG: consulta com documentos'
  },
  {
    label: 'Usuários e Acessos',
    to: '/admin/users',
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    roles: ['rh']
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const user = authService.getUser();
  const currentRole = user?.role || 'colaborador';
  const [unreadTicketsCount, setUnreadTicketsCount] = useState<number>(0);
  const [rhOpenUnassigned, setRhOpenUnassigned] = useState<number>(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => {
      const notifs = notificationStore.getNotifications();
      const count = notifs.filter(
        (n) => (n.refType === 'chamado' || n.type.startsWith('chamado_')) && !n.isRead
      ).length;
      setUnreadTicketsCount(count);
    };
    update();
    const unsub = notificationStore.subscribe(update);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentRole !== 'rh') return;
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const { http } = await import('../../services/http');
        const res = await http.get('/api/tickets/counts');
        if (!cancelled) {
          setRhOpenUnassigned(Number(res.data?.openUnassigned ?? 0));
        }
      } catch {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentRole]);

  // Focar no botão de fechar ao abrir a gaveta mobile
  useEffect(() => {
    if (isMobileOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isMobileOpen]);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(currentRole));

  const sidebarContent = (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: 'var(--bg-nav)', borderRight: '1px solid var(--border-nav)' }}>
      {/* ── Brand Header ── */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 'var(--topbar-height)', borderBottom: '1px solid var(--border-nav)', backgroundColor: 'var(--bg-nav)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold tracking-tight block truncate" style={{ color: 'var(--text-nav)' }}>TOTVS RH</span>
            <span className="text-[10px] font-semibold block -mt-0.5 uppercase tracking-wider truncate" style={{ color: 'var(--accent-secondary)' }}>
              Inteligente
            </span>
          </div>
        </div>

        {/* Botão de Fechar – visível só na gaveta mobile */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onCloseMobile}
          className="p-2 rounded-lg lg:hidden transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          style={{ color: 'var(--text-nav-muted)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-nav-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-nav)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ''; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-nav-muted)'; }}
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* ── Role Indicator Banner ── */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl shrink-0" style={{ backgroundColor: 'var(--bg-nav-surface)', border: '1px solid var(--border-nav)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: 'var(--text-nav-muted)' }}>
          Perfil de Acesso
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold capitalize truncate" style={{ color: 'var(--text-nav)' }}>{currentRole}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true"></span>
        </div>
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Módulos do sistema">
        <div className="text-[10px] font-bold uppercase tracking-wider px-3 py-2" style={{ color: 'var(--text-nav-muted)' }}>
          Módulos
        </div>

        {visibleItems.map((item) => {
          const dynamicBadgeText =
            item.to === '/chamados' && unreadTicketsCount > 0
              ? String(unreadTicketsCount)
              : item.to === '/rh/chamados' && rhOpenUnassigned > 0
              ? String(rhOpenUnassigned)
              : item.badge ?? null;
          const badgeA11y =
            item.to === '/chamados' && unreadTicketsCount > 0
              ? `${unreadTicketsCount} notificações não lidas`
              : item.to === '/rh/chamados' && rhOpenUnassigned > 0
              ? `${rhOpenUnassigned} chamados abertos sem responsável`
              : item.badgeA11y ?? null;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.label}
              onClick={() => onCloseMobile?.()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] min-w-0',
                  isActive
                    ? 'font-semibold shadow-xs border-l-4 border-brand-500'
                    : ''
                )
              }
              style={({ isActive }) => isActive
                ? { backgroundColor: 'var(--bg-nav-active)', color: 'var(--accent-secondary)' }
                : { color: 'var(--text-nav-muted)' }
              }
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = 'var(--bg-nav-hover)';
                  el.style.color = 'var(--text-nav)';
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.getAttribute('aria-current')) {
                  el.style.backgroundColor = '';
                  el.style.color = 'var(--text-nav-muted)';
                }
              }}
            >
              {/* Ícone — não encolhe */}
              <span className="shrink-0" aria-hidden="true">{item.icon}</span>

              {/* Texto — truncado quando espaço insuficiente */}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>

              {/* Selo — separado do texto com ml-2, nunca quebra */}
              {dynamicBadgeText && (
                <span
                  className={cn(
                    'shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide whitespace-nowrap',
                    item.to === '/chamados' || item.to === '/rh/chamados'
                      ? 'bg-accent-primary text-white'
                      : 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                  )}
                  aria-label={badgeA11y ?? undefined}
                  title={badgeA11y ?? undefined}
                >
                  {dynamicBadgeText}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Rodapé ── */}
      <div className="p-4 text-[11px] shrink-0" style={{ borderTop: '1px solid var(--border-nav)', color: 'var(--text-nav-muted)' }}>
        TOTVS RH Inteligente v1.0
        <span className="block text-[10px] mt-0.5" style={{ color: 'var(--text-nav-muted)', opacity: 0.7 }}>TCC Case TOTVS</span>
      </div>
    </div>
  );

  return (
    <>
      {/*
        ── Sidebar Desktop/Tablet fixa (≥ 1024 px) ──
        Largura definida pela variável --sidebar-width (18rem = 288 px),
        igual para todos os perfis. Nunca usa w-auto nem depende do conteúdo.
      */}
      <aside
        className="hidden lg:flex flex-col sticky top-0 h-screen"
        style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)' }}
        aria-label="Menu de navegação"
      >
        {sidebarContent}
      </aside>

      {/*
        ── Drawer Mobile (<1024 px) ──
        Sobreposição com backdrop; não ocupa espaço no grid.
      */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[var(--z-drawer)] lg:hidden flex animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Menu de Navegação Principal"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Gaveta lateral */}
          <aside
            className="relative z-10 flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-250"
            style={{ width: 'var(--sidebar-width)', maxWidth: '85vw' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
