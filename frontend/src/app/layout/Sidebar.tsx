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
  Sparkles
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
    roles: ['rh']
  },
  {
    label: 'Assistente Trabalhista',
    to: '/assistant',
    icon: <HelpCircle className="w-4 h-4" />,
    roles: ['rh'],
    badge: 'RAG'
  }
];

export const Sidebar: React.FC = () => {
  const user = authService.getUser();
  const currentRole = user?.role || 'colaborador';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight block text-white">TOTVS RH</span>
          <span className="text-[10px] font-medium text-blue-400 block -mt-0.5 uppercase tracking-wider">
            Inteligente
          </span>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="px-4 py-3 mx-3 my-3 bg-slate-800/80 rounded-xl border border-slate-700/50">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-0.5">
          Perfil de Acesso
        </span>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white capitalize">{currentRole}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
          Módulos
        </div>

        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <div className="flex items-center gap-2.5">
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        TOTVS RH Inteligente v1.0
        <span className="block text-[10px] text-slate-600 mt-0.5">TCC Case TOTVS</span>
      </div>
    </aside>
  );
};
