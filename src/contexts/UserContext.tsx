import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { todayISO } from '@/utils/streak';
import {
  recordProductiveDay as apiRecordProductiveDay,
  updateGoals as apiUpdateGoals,
} from '@/services/authService';
import { GOAL_DEFAULTS, clampGoal, clampGoals, shouldSeed, type Goals } from '@/utils/goals';

export interface NotificationPrefs {
  pending: boolean;
  deadline: boolean;
  daily: boolean;
  events: boolean; // lembretes de eventos da Agenda
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  avatar?: string; // dataURL
  dailyGoal: number;
  weeklyGoal: number;
  notifications: NotificationPrefs;
  productiveDays: string[]; // ISO 'YYYY-MM-DD' com pelo menos uma conclusão
  // Dias da semana que contam para a sequência (0=domingo … 6=sábado).
  // Dias fora da lista são "folga": não quebram a sequência se ficarem vazios.
  streakDays: number[];
}

interface UserContextValue {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  recordProductiveDay: () => void;
  // Troca o "escopo" dos dados por conta (id do usuário) ou null (visitante).
  setScope: (scope: string | null) => void;
  /** Salva as metas no servidor (e localmente). Visitante fica só local. */
  saveGoals: (goals: Partial<Goals>) => void;
  /** Reconcilia as metas locais com as do servidor no login/hidratação. */
  hydrateGoals: (scopeId: string, server: Partial<Goals>) => void;
}

const STORAGE_KEY = 'fassaja_user';

/**
 * Marca que a meta desta conta já foi reconciliada com o servidor.
 *
 * Chave própria em vez de um campo no perfil porque ela não é dado do usuário
 * — é o registro de que uma migração de mão única já aconteceu neste
 * navegador. Guardada junto do perfil, seria enviada, lida e persistida como
 * se fizesse parte dele.
 */
function goalsSeededKey(scope: string): string {
  return `fassaja_goals_seeded_${scope}`;
}

// Dados (metas/preferências/sequência) são por conta: guest na chave legada,
// usuários autenticados em chaves próprias — evita vazar entre contas no mesmo navegador.
function storageKey(scope: string): string {
  return scope === 'guest' ? STORAGE_KEY : `${STORAGE_KEY}_${scope}`;
}

const defaultUser: UserProfile = {
  name: 'Visitante',
  email: '',
  role: 'Conta visitante',
  avatar: undefined,
  // Padrões de utils/goals — espelho dos defaults da coluna no banco. Até
  // aqui vinham de src/data/mockUser.ts: a meta inicial de todo mundo em
  // produção era a do "joao@example.com" de um arquivo de exemplo.
  dailyGoal: GOAL_DEFAULTS.daily,
  weeklyGoal: GOAL_DEFAULTS.weekly,
  notifications: { pending: true, deadline: true, daily: true, events: true },
  productiveDays: [],
  streakDays: [0, 1, 2, 3, 4, 5, 6],
};

function loadUser(scope: string): UserProfile {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (raw) return { ...defaultUser, ...JSON.parse(raw) };
  } catch {
    // ignora JSON inválido
  }
  return defaultUser;
}

const UserContext = createContext<UserContextValue>({
  user: defaultUser,
  updateUser: () => {},
  recordProductiveDay: () => {},
  setScope: () => {},
  saveGoals: () => {},
  hydrateGoals: () => {},
});

export const useUser = () => useContext(UserContext);

// Lógica pura da sequência (extraída para src/utils/streak.ts para ser
// testável em Node); reexportada aqui para manter os imports existentes.
export { computeStreak } from '@/utils/streak';

/** Iniciais do nome para o avatar fallback. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scope, setScopeState] = useState<string>('guest');
  const [user, setUser] = useState<UserProfile>(() => loadUser('guest'));

  // Persiste sempre na chave do escopo atual.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(scope), JSON.stringify(user));
    } catch {
      // armazenamento indisponível
    }
  }, [user, scope]);

  const setScope = useCallback((s: string | null) => {
    const sc = s ?? 'guest';
    setScopeState(sc);
    setUser(loadUser(sc)); // carrega os dados daquela conta
  }, []);

  const updateUser = (patch: Partial<UserProfile>) =>
    setUser(prev => ({ ...prev, ...patch }));

  // Marca hoje como produtivo (otimista) e persiste no servidor. Guest fica só
  // local; autenticado grava via API — a rota é idempotente (upsert userId+date),
  // então repetir no mesmo dia é inofensivo. Falha de rede não trava a UI.
  const recordProductiveDay = () => {
    const today = todayISO();
    setUser(prev =>
      prev.productiveDays.includes(today)
        ? prev
        : { ...prev, productiveDays: [...prev.productiveDays, today] },
    );
    if (scope !== 'guest') {
      apiRecordProductiveDay(today).catch(() => {
        // best-effort: o dia já está refletido localmente e será reconciliado
        // na próxima hidratação (GET /auth/productive-days).
      });
    }
  };

  /**
   * Salva as metas. Otimista na tela, best-effort no servidor: a meta é
   * preferência, não transação — travar a interface esperando a rede para
   * gravar o número 8 seria pior que o risco de ele chegar um segundo depois.
   * Visitante não tem conta, então fica só no localStorage.
   */
  const saveGoals = useCallback(
    (patch: Partial<Goals>) => {
      setUser(prev => {
        const alvo = clampGoals({
          daily: patch.daily ?? prev.dailyGoal,
          weekly: patch.weekly ?? prev.weeklyGoal,
        });
        return { ...prev, dailyGoal: alvo.daily, weeklyGoal: alvo.weekly };
      });
      if (scope === 'guest') return;
      // Envia SÓ o que mudou: o backend trata cada campo como opcional para o
      // blur de um input não gravar por cima do outro.
      const corpo: { dailyGoal?: number; weeklyGoal?: number } = {};
      if (patch.daily !== undefined) corpo.dailyGoal = clampGoal(patch.daily, 'daily');
      if (patch.weekly !== undefined) corpo.weeklyGoal = clampGoal(patch.weekly, 'weekly');
      if (Object.keys(corpo).length === 0) return;
      apiUpdateGoals(corpo).catch(() => {
        // Fica valendo o valor local; a próxima hidratação reconcilia.
      });
    },
    [scope],
  );

  /**
   * Reconcilia a meta local com a do servidor, uma vez por conta.
   *
   * Lê o localStorage direto (e não o estado) porque isto é chamado no mesmo
   * tick do `setScope`, quando o estado ainda é o da conta anterior.
   *
   * A decisão de semear está em utils/goals.shouldSeed, com teste: é um
   * caminho que roda UMA vez por conta e, se errar, apaga a meta de alguém.
   */
  const hydrateGoals = useCallback((scopeId: string, server: Partial<Goals>) => {
    // Servidor antigo (sem os campos): não há nada a reconciliar, e adotar
    // `undefined` como zero apagaria a meta local.
    if (typeof server.daily !== 'number' || typeof server.weekly !== 'number') return;

    const doServidor = clampGoals({ daily: server.daily, weekly: server.weekly });
    const chave = goalsSeededKey(scopeId);
    let jaSemeado = false;
    try {
      jaSemeado = localStorage.getItem(chave) === '1';
    } catch {
      // armazenamento indisponível: trata como não semeado
    }

    const local = loadUser(scopeId);
    const doNavegador = clampGoals({ daily: local.dailyGoal, weekly: local.weeklyGoal });

    const marcar = () => {
      try {
        localStorage.setItem(chave, '1');
      } catch {
        // sem armazenamento, a reconciliação roda de novo — é idempotente
      }
    };

    if (!jaSemeado && shouldSeed(doNavegador, doServidor)) {
      // Recuperação: a meta que a pessoa escolheu antes de existir coluna.
      // Só marca como semeada se o servidor confirmar — falhar e marcar
      // perderia a meta de vez na próxima carga.
      apiUpdateGoals({ dailyGoal: doNavegador.daily, weeklyGoal: doNavegador.weekly })
        .then(marcar)
        .catch(() => undefined);
      setUser(prev => ({ ...prev, dailyGoal: doNavegador.daily, weeklyGoal: doNavegador.weekly }));
      return;
    }

    marcar();
    setUser(prev => ({ ...prev, dailyGoal: doServidor.daily, weeklyGoal: doServidor.weekly }));
  }, []);

  return (
    <UserContext.Provider
      value={{ user, updateUser, recordProductiveDay, setScope, saveGoals, hydrateGoals }}
    >
      {children}
    </UserContext.Provider>
  );
};
