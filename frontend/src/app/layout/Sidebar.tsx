import React from 'react';
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
  X
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserRole } from '../../types/auth';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: UserRole[];
  badge?: string;
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
    icon: <MessageSquare className="w-4 h-4" />,
    roles: ['colaborador']
  },
  {
    label: 'Meu Perfil',
    to: '/me',
    icon: <User className="w-4 h-4" />,
    roles: ['colaborador']
  },

  // RH
  {
    label: 'Onboarding com IA',
    to: '/onboarding',
    icon: <UserPlus className="w-4 h-4" />,
    roles: ['rh'],
    badge: 'IA'
  },
  {
    label: 'Inteligência Preditiva',
    to: '/analytics',
    icon: <TrendingUp className="w-4 h-4" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Compliance Inteligente',
    to: '/compliance',
    icon: <ShieldCheck className="w-4 h-4" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Base de Conhecimento',
    to: '/knowledge',
    icon: <BookOpen className="w-4 h-4" />,
    roles: ['rh', 'gestor']
  },
  {
    label: 'Assistente Trabalhista',
    to: '/assistant',
    icon: <HelpCircle className="w-4 h-4" />,
    roles: ['rh', 'gestor'],
    badge: 'RAG'
  },
  {
    label: 'Usuários e Acessos',
    to: '/admin/users',
    icon: <Users className="w-4 h-4" />,
    roles: ['rh']
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const user = authService.getUser();
  const currentRole = user?.role || 'colaborador';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(currentRole));

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-950 text-text-on-brand">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-brand-700/60 bg-brand-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight block text-white">TOTVS RH</span>
            <span className="text-[10px] font-medium text-brand-300 block -mt-0.5 uppercase tracking-wider">
              Inteligente
            </span>
          </div>
        </div>

        {/* Botão de Fechar para Mobile */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-brand-700/50 md:hidden transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 py-3 mx-3 my-3 bg-brand-900/60 rounded-xl border border-brand-700/60 shrink-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300 block mb-0.5">
          Perfil de Acesso
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white capitalize">{currentRole}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
          Módulos
        </div>

        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => onCloseMobile?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group min-h-[40px]',
                isActive
                  ? 'bg-brand-700 text-white font-semibold shadow-xs border-l-4 border-brand-500'
                  : 'text-slate-300 hover:bg-brand-700/50 hover:text-white'
              )
            }
          >
            <div className="flex items-center gap-2.5">
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/30 text-brand-300 border border-brand-500/40">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-brand-700/60 text-[11px] text-slate-400 shrink-0">
        TOTVS RH Inteligente v1.0
        <span className="block text-[10px] text-slate-400 mt-0.5">TCC Case TOTVS</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop Fixa */}
      <aside className="hidden md:flex w-64 shrink-0 min-h-screen border-r border-brand-700/50">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile com Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop Escurecido */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Gaveta Lateral */}
          <aside
            className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-250"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação Principal"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
