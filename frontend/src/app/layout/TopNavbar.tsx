import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronDown,
  Menu,
  LifeBuoy
} from 'lucide-react';
import { authService } from '../../services/authService';
import { Button } from '../../components/ui/Button';
import { notificationStore, NotificationItem } from '../../features/compliance/notifications';
import { formatDate } from '../../lib/formatters';
import { AccessibilityPanel } from '../../features/accessibility/components/AccessibilityPanel';
import { ThemeToggle } from '../../features/theme/components/ThemeToggle';
import { ChangePasswordModal } from '../../features/admin/components/ChangePasswordModal';
import { FloatingPanel } from '../../components/ui/FloatingPanel';

interface TopNavbarProps {
  onToggleMobileSidebar?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isA11yOpen, setIsA11yOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const update = () => {
      setNotifications([...notificationStore.getNotifications()]);
      setUnreadCount(notificationStore.getUnreadCount());
    };
    update();
    const unsubscribe = notificationStore.subscribe(update);
    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationStore.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationStore.markAllAsRead();
  };

  const handleNotificationClick = (notif: NotificationItem) => {
    handleMarkAsRead(notif.id);
    setIsOpen(false);
    if (notif.refType === 'chamado' || notif.type.startsWith('chamado_')) {
      const ticketId = notif.refId || notif.id.replace('chamado-', '');
      if (user?.role === 'rh') {
        navigate(`/rh/chamados/${ticketId}`);
      } else {
        navigate(`/chamados/${ticketId}`);
      }
    }
  };

  const getNotifIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'alerta':
        return <AlertTriangle className="w-3.5 h-3.5 text-risk-high" />;
      case 'obrigacao':
        return <Clock className="w-3.5 h-3.5 text-risk-moderate" />;
      case 'auditoria':
        return <ShieldCheck className="w-3.5 h-3.5 text-info" />;
      case 'chamado_respondido':
      case 'chamado_resolvido':
      case 'chamado_novo':
      case 'chamado_mensagem':
        return <LifeBuoy className="w-3.5 h-3.5 text-brand-500" />;
    }
  };

  return (
    <header
      className="px-3 sm:px-4 lg:px-6 flex items-center justify-between sticky top-0 shadow-xs"
      style={{
        height: 'var(--topbar-height)',
        zIndex: 'var(--z-topbar)',
        backgroundColor: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border-nav)',
        color: 'var(--text-nav)',
      }}
    >
      {/* ── Lado esquerdo: hambúrguer (mobile) + título ── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Botão Hambúrguer – visível apenas até 1024 px */}
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg lg:hidden transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-nav-muted)' }}
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        <h2 className="text-xs sm:text-sm font-semibold truncate min-w-0" style={{ color: 'var(--text-nav)' }}>
          Painel de Gestão e Operação
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Botão de Troca de Cor (Fundo Escuro / Fundo Claro) */}
        <ThemeToggle />

        {/* Botão de Acessibilidade */}
        <button
          type="button"
          onClick={() => setIsA11yOpen(true)}
          className="p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[var(--bg-nav-hover)]"
          style={{ color: 'var(--text-nav-muted)' }}
          title="Acessibilidade e Preferências"
          aria-label="Abrir painel de acessibilidade"
        >
          <Accessibility className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Notificações (Sino com Contador) */}
        <div>
          <button
            ref={bellButtonRef}
            id="notifications-button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: 'var(--text-nav-muted)' }}
            title="Notificações"
            aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
            aria-expanded={isOpen}
            aria-controls="notifications-panel"
            aria-haspopup="dialog"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Painel Flutuante de Notificações em Portal */}
          <FloatingPanel
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            anchorRef={bellButtonRef}
            id="notifications-panel"
            ariaLabel="Painel de Notificações"
            role="region"
            desktopWidth="24rem"
          >
            <div className="p-3 bg-bg-elevated border-b border-border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent-primary" />
                <span className="text-xs font-bold text-text-primary">Notificações</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-accent-primary/10 text-accent-primary border border-accent-primary/20 font-semibold px-1.5 py-0.2 rounded-full">
                    {unreadCount} novas
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[11px] text-accent-primary hover:text-accent-primary/80 font-medium flex items-center gap-1 focus:outline-hidden focus:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Marcar todas</span>
                </button>
              )}
            </div>

            <div className="overflow-y-auto divide-y divide-border-subtle/60 flex-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-secondary">
                  Nenhuma notificação recente.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 text-xs transition-colors cursor-pointer ${
                      notif.isRead ? 'bg-bg-surface hover:bg-bg-subtle' : 'bg-accent-primary/10 hover:bg-accent-primary/15'
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
                          <span className="text-[10px] text-text-muted mt-1 block">
                            {formatDate(notif.date)}
                          </span>
                        </div>
                      </div>

                      {!notif.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.id);
                          }}
                          className="p-1 text-text-secondary hover:text-accent-primary rounded shrink-0 focus:outline-hidden focus:ring-1 focus:ring-accent-primary"
                          title="Marcar como lida"
                          aria-label={`Marcar notificação "${notif.title}" como lida`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </FloatingPanel>
        </div>

        <div className="h-4 w-px bg-border-subtle"></div>

        {/* Menu do Usuário */}
        <div>
          <button
            ref={userButtonRef}
            id="user-menu-button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-nav-hover transition-colors text-left"
            title="Opções do usuário"
            aria-label="Opções do usuário"
            aria-expanded={isUserMenuOpen}
            aria-controls="user-menu-panel"
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 rounded-full bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center text-accent-primary font-bold shrink-0">
              <UserIcon className="w-4 h-4" aria-hidden="true" />
            </div>
            {/* E-mail com truncate e dica para não estourar a topbar */}
            <div className="hidden md:block text-left min-w-0 max-w-[160px]">
              <span
                className="text-xs font-semibold text-text-primary block leading-tight truncate"
                title={user?.email || 'Usuário'}
              >
                {user?.email || 'Usuário'}
              </span>
              <span className="text-[10px] text-accent-secondary block uppercase font-medium truncate">
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden sm:block shrink-0" aria-hidden="true" />
          </button>

          {/* Painel Flutuante do Menu do Usuário em Portal */}
          <FloatingPanel
            isOpen={isUserMenuOpen}
            onClose={() => setIsUserMenuOpen(false)}
            anchorRef={userButtonRef}
            id="user-menu-panel"
            ariaLabel="Menu do usuário"
            role="menu"
            desktopWidth="14rem"
          >
            <div className="p-3 bg-bg-elevated border-b border-border-subtle">
              <span className="text-[11px] font-semibold text-text-secondary block">
                Conectado como
              </span>
              <span className="text-xs font-bold text-text-primary block truncate">
                {user?.email}
              </span>
              <span className="text-[10px] uppercase font-semibold text-accent-primary bg-accent-primary/10 border border-accent-primary/25 px-1.5 py-0.5 rounded inline-block mt-1">
                Perfil: {user?.role}
              </span>
            </div>

            <div className="p-1 space-y-0.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsChangePasswordOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-nav-hover rounded-lg transition-colors text-left"
              >
                <KeyRound className="w-4 h-4 text-accent-primary shrink-0" />
                <span>Alterar Minha Senha</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  authService.logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Encerrar Sessão</span>
              </button>
            </div>
          </FloatingPanel>
        </div>

        {/* Botão de Logout Rápido */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => authService.logout()}
          className="text-text-secondary hover:text-rose-500 hover:bg-rose-500/10 gap-1.5 text-xs hidden lg:flex"
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
