import React, { useState, useEffect, useRef } from 'react';
import { LogOut, Bell, User as UserIcon, Check, CheckCheck, X, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { notificationStore, NotificationItem } from '../../features/compliance/notifications';
import { formatDate } from '../../lib/formatters';

export const TopNavbar: React.FC = () => {
  const user = authService.getUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setNotifications([...notificationStore.getNotifications()]);
      setUnreadCount(notificationStore.getUnreadCount());
    };
    update();
    const unsubscribe = notificationStore.subscribe(update);
    return () => unsubscribe();
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    notificationStore.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationStore.markAllAsRead();
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alerta':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />;
      case 'obrigacao':
        return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case 'auditoria':
        return <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-800">
          Painel de Gestão e Operação
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notificações (Sino com Contador) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Ler todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 transition-colors ${
                        notif.isRead ? 'bg-white' : 'bg-blue-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="p-1 rounded-md bg-slate-100 shrink-0 mt-0.5">
                            {getNotifIcon(notif.type)}
                          </span>
                          <div>
                            <h4
                              className={`text-xs ${
                                notif.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {formatDate(notif.date)}
                            </span>
                          </div>
                        </div>

                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded shrink-0"
                            title="Marcar como lida"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

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
