import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AlertCircle, Bell, CalendarClock, CheckCircle2, Send, UserPlus } from 'lucide-react';
import { useTasks } from './TasksContext';
import { useEvents } from './EventsContext';
import { useAuth } from './AuthContext';
import { useUser } from './UserContext';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { formatDate, isToday } from '@/utils/date';
import { CalendarEvent } from '@/types/event';
import { reminderTriggerDate, eventEndDate } from '@/utils/eventReminders';

// Texto de quando o evento acontece (reaproveitado no sino e no push).
function whenLabel(e: CalendarEvent): string {
  const day = isToday(e.date) ? 'Hoje' : formatDate(e.date);
  if (e.allDay) return `${day} • dia inteiro`;
  return e.startTime ? `${day} às ${e.startTime}` : day;
}

export interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
  link: string; // rota para onde o item leva
  read: boolean;
}

interface JoinRequestInfo {
  id: string;
  name: string;
  teamName: string;
}

interface NotificationsContextValue {
  items: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>(
  {} as NotificationsContextValue,
);

export const useNotifications = () => useContext(NotificationsContext);

function readKey(userId: string | undefined): string {
  return `fassaja_notif_read_${userId ?? 'guest'}`;
}

function loadReadIds(userId: string | undefined): Set<string> {
  try {
    const raw = localStorage.getItem(readKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tasks } = useTasks();
  const { events } = useEvents();
  const { account } = useAuth();
  const { user } = useUser();
  const prefs = user.notifications;
  const userId = account?.id;

  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds(userId));
  const [joinRequests, setJoinRequests] = useState<JoinRequestInfo[]>([]);
  // "Relógio" que avança de minuto em minuto para reavaliar lembretes por tempo.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Recarrega o estado de "lido" ao trocar de usuário.
  useEffect(() => {
    setReadIds(loadReadIds(userId));
  }, [userId]);

  // Pedidos de entrada pendentes nas equipes que o usuário é dono.
  const refresh = useCallback(() => {
    if (!userId) {
      setJoinRequests([]);
      return;
    }
    teamsService
      .listTeams()
      .then(async teams => {
        const owned = teams.filter(t => t.role === 'owner');
        const lists = await Promise.all(
          owned.map(team =>
            invitesService
              .listRequests(team.id)
              .then(reqs => reqs.map(r => ({ id: r.id, name: r.name, teamName: team.name })))
              .catch(() => [] as JoinRequestInfo[]),
          ),
        );
        setJoinRequests(lists.flat());
      })
      .catch(() => setJoinRequests([]));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const persist = useCallback(
    (ids: Set<string>) => {
      try {
        localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
      } catch {
        // localStorage indisponível
      }
    },
    [userId],
  );

  const items = useMemo<NotificationItem[]>(() => {
    const raw: Omit<NotificationItem, 'read'>[] = [];

    // Propostas de tarefa pendentes para o usuário atual.
    if (account) {
      tasks
        .filter(t => t.assigneeId === account.id && t.assignmentStatus === 'pending')
        .forEach(t =>
          raw.push({
            id: `p-${t.id}`,
            icon: <Send size={18} />,
            title: t.title,
            detail: 'Tarefa proposta a você',
            tone: '#FBBF24',
            link: '/tasks',
          }),
        );
    }

    // Pedidos de entrada nas equipes que você administra.
    joinRequests.forEach(r =>
      raw.push({
        id: `jr-${r.id}`,
        icon: <UserPlus size={18} />,
        title: r.name,
        detail: `Pediu para entrar em ${r.teamName}`,
        tone: '#2477FF',
        link: '/team',
      }),
    );

    // "Prazos próximos" controla as atrasadas.
    if (prefs.deadline) {
      tasks
        .filter(t => t.status === 'overdue')
        .forEach(t =>
          raw.push({
            id: `o-${t.id}`,
            icon: <AlertCircle size={18} />,
            title: t.title,
            detail: t.dueDate ? `Atrasada desde ${formatDate(t.dueDate)}` : 'Tarefa atrasada',
            tone: '#F43F5E',
            link: '/tasks',
          }),
        );
    }

    // "Tarefas pendentes" controla as que vencem hoje.
    if (prefs.pending) {
      tasks
        .filter(t => t.status !== 'completed' && t.dueDate && isToday(t.dueDate))
        .forEach(t =>
          raw.push({
            id: `t-${t.id}`,
            icon: <CalendarClock size={18} />,
            title: t.title,
            detail: 'Vence hoje',
            tone: '#2477FF',
            link: '/tasks',
          }),
        );
    }

    // Lembretes da Agenda: aparecem do horário do lembrete até o fim do evento.
    if (prefs.events) {
      const now = Date.now();
      events.forEach(e => {
        const trigger = reminderTriggerDate(e);
        const end = eventEndDate(e);
        if (!trigger || !end) return;
        if (now >= trigger.getTime() && now <= end.getTime()) {
          raw.push({
            id: `ev-${e.id}`,
            icon: <Bell size={18} />,
            title: e.title,
            detail: whenLabel(e),
            tone: e.color,
            link: '/agenda',
          });
        }
      });
    }

    // "Lembretes diários" controla o resumo de concluídas hoje.
    if (prefs.daily) {
      tasks
        .filter(t => t.status === 'completed' && t.completedAt && isToday(t.completedAt))
        .slice(0, 2)
        .forEach(t =>
          raw.push({
            id: `d-${t.id}`,
            icon: <CheckCircle2 size={18} />,
            title: t.title,
            detail: 'Concluída hoje',
            tone: '#22C55E',
            link: '/tasks',
          }),
        );
    }

    return raw.map(item => ({ ...item, read: readIds.has(item.id) }));
    // `tick` força a reavaliação periódica dos lembretes baseados em horário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, events, account, joinRequests, readIds, prefs, tick]);

  const unreadCount = useMemo(() => items.filter(i => !i.read).length, [items]);

  // Obs.: a notificação do SISTEMA (mesmo com o app fechado) é enviada pelo
  // backend via Web Push (ver módulo push/cron de lembretes). Aqui o contexto
  // cuida só do sino in-app, evitando notificação duplicada.

  const markRead = useCallback(
    (id: string) => {
      setReadIds(prev => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      items.forEach(i => next.add(i.id));
      persist(next);
      return next;
    });
  }, [items, persist]);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, markRead, markAllRead, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
};
