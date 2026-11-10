// Gerenciamento de notificações do TOTVS Compliance Inteligente (Fase F4b)

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'alerta' | 'obrigacao' | 'auditoria';
  isRead: boolean;
}

const STORAGE_KEY = 'totvs_compliance_notifications';

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Obrigação próxima do vencimento',
    message: 'Transmissão DCTFWeb Previdenciária (INSS) vence em 5 dias.',
    date: '2026-11-10T08:30:00Z',
    type: 'obrigacao',
    isRead: false
  },
  {
    id: 'notif-2',
    title: 'Inconsistência de severidade alta',
    message: 'Detectada divergência de data de admissão e início de vínculo no eSocial.',
    date: '2026-11-09T14:15:00Z',
    type: 'alerta',
    isRead: false
  },
  {
    id: 'notif-3',
    title: 'Obrigação com prazo vencido',
    message: 'Renovação Exames Médicos Periódicos (SESMT / NR-07) em atraso.',
    date: '2026-11-01T10:00:00Z',
    type: 'obrigacao',
    isRead: false
  },
  {
    id: 'notif-4',
    title: 'Auditoria cadastral executada',
    message: 'Varredura automática finalizada com 30 registros analisados.',
    date: '2026-11-09T17:45:00Z',
    type: 'auditoria',
    isRead: true
  }
];

class NotificationStore {
  private notifications: NotificationItem[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.notifications = JSON.parse(raw);
      } else {
        this.notifications = INITIAL_NOTIFICATIONS;
        this.save();
      }
    } catch {
      this.notifications = INITIAL_NOTIFICATIONS;
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    } catch {
      // ignore
    }
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getNotifications(): NotificationItem[] {
    return this.notifications;
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markAsRead(id: string) {
    this.notifications = this.notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
    this.save();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.save();
  }

  addNotification(item: Omit<NotificationItem, 'id' | 'isRead'>) {
    // Evita duplicação: se já existir uma notificação com o mesmo título e mensagem, não adiciona
    const exists = this.notifications.some(
      (n) => n.title === item.title && n.message === item.message
    );
    if (exists) return;

    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isRead: false
    };
    this.notifications = [newNotif, ...this.notifications];
    this.save();
  }
}

export const notificationStore = new NotificationStore();
