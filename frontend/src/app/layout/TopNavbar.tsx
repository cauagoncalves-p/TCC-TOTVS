import React from 'react';
import { LogOut, Bell, User as UserIcon } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';

export const TopNavbar: React.FC = () => {
  const user = authService.getUser();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Painel de Gestão e Operação
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificações (Sino) */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Notificações"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
        </button>

        <div className="h-4 w-px bg-slate-200"></div>

        {/* Informações do Usuário */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <span className="text-xs font-semibold text-slate-800 block leading-tight">
              {user?.email || 'Usuário'}
            </span>
            <span className="text-[10px] text-slate-500 block uppercase font-medium">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Botão de Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authService.logout()}
          className="text-slate-600 hover:text-red-600 hover:bg-red-50 gap-1.5 text-xs ml-2"
          title="Encerrar sessão"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
};
