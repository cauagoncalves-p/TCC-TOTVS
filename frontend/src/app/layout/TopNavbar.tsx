import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  Bell,
  User as UserIcon,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Accessibility,
  KeyRound,
  ChevronDown
} from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { notificationStore, NotificationItem } from '../../features/compliance/notifications';
import { formatDate } from '../../lib/formatters';
import { AccessibilityPanel } from '../../features/accessibility/components/AccessibilityPanel';
import { ChangePasswordModal } from '../../features/admin/components/ChangePasswordModal';

export const TopNavbar: React.FC = () => {
  const user = authService.getUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isA11yOpen, setIsA11yOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    if (isOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isUserMenuOpen]);

  const handleMarkAsRead = (id: string) => {
    notificationStore.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationStore.markAllAsRead();
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alerta':
        return <AlertTriangle className="w-3.5 h-3.5 text-risk-high" />;
      case 'obrigacao':
        return <Clock className="w-3.5 h-3.5 text-risk-moderate" />;
      case 'auditoria':
        return <ShieldCheck className="w-3.5 h-3.5 text-info" />;
    }
  };

  return (
    <header className="h-16 bg-brand-950 text-text-on-brand border-b border-brand-700/60 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-text-on-brand">
          Painel de Gestão e Operação
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Botão de Acessibilidade */}
        <button
          type="button"
          onClick={() => setIsA11yOpen(true)}
          className="p-2 text-slate-300 hover:text-white hover:bg-brand-700/50 rounded-lg transition-colors"
          title="Acessibilidade (Tradutor de Libras)"
          aria-label="Abrir painel de acessibilidade"
        >
          <Accessibility className="w-4 h-4" />
        </button>

        {/* Notificações (Sino com Contador) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-brand-700/50 rounded-lg transition-colors"
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown de Notificações */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-app-surface text-text-primary border border-app-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100">
              <div className="p-3 bg-app-bg border-b border-app-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold text-brand-900">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-brand-100 text-brand-900 font-semibold px-1.5 py-0.2 rounded-full">
                      {unreadCount} novas
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Marcar todas</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-app-border/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-secondary">
                    Nenhuma notificação recente.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors ${
                        notif.isRead ? 'bg-app-surface hover:bg-app-bg' : 'bg-brand-100/40 hover:bg-brand-100/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">{getNotifIcon(notif.type)}</div>
                          <div>
                            <span className="font-semibold text-text-primary block leading-tight">
                              {notif.title}
                            </span>
                            <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">
                              {notif.message}
                            </p>
                            <span className="text-[10px] text-text-secondary/70 mt-1 block">
                              {formatDate(notif.date)}
                            </span>
                          </div>
                        </div>

                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 text-text-secondary hover:text-brand-500 rounded shrink-0"
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

        <div className="h-4 w-px bg-brand-700"></div>

        {/* Menu do Usuário */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-brand-700/50 transition-colors text-left"
            title="Opções do usuário"
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded-full bg-brand-900 border border-brand-700 flex items-center justify-center text-slate-200 shrink-0">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold text-text-on-brand block leading-tight">
                {user?.email || 'Usuário'}
              </span>
              <span className="text-[10px] text-brand-300 block uppercase font-medium">
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Dropdown do Usuário */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-app-surface text-text-primary border border-app-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100">
              <div className="p-3 bg-app-bg border-b border-app-border">
                <span className="text-[11px] font-semibold text-text-secondary block">
                  Conectado como
                </span>
                <span className="text-xs font-bold text-brand-900 block truncate">
                  {user?.email}
                </span>
                <span className="text-[10px] uppercase font-semibold text-brand-700 bg-brand-100 px-1.5 py-0.5 rounded inline-block mt-1">
                  Perfil: {user?.role}
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-brand-100/60 hover:text-brand-900 rounded-lg transition-colors text-left"
                >
                  <KeyRound className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Alterar Minha Senha</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    authService.logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-risk-high hover:bg-risk-high-bg rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-risk-high" />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Logout Rápido */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authService.logout()}
          className="text-slate-300 hover:text-rose-300 hover:bg-brand-700/50 gap-1.5 text-xs hidden lg:flex"
          title="Encerrar sessão"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </Button>
      </div>

      {/* Painel de Acessibilidade */}
      <AccessibilityPanel
        isOpen={isA11yOpen}
        onClose={() => setIsA11yOpen(false)}
      />

      {/* Modal de Alterar Senha */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
};
