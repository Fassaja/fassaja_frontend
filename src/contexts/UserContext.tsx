import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { mockUser } from '@/data/mockUser';
import { todayISO } from '@/utils/streak';

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
}

const STORAGE_KEY = 'fassaja_user';

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
  dailyGoal: mockUser.dailyGoal,
  weeklyGoal: mockUser.weeklyGoal,
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

  const recordProductiveDay = () =>
    setUser(prev =>
      prev.productiveDays.includes(todayISO())
        ? prev
        : { ...prev, productiveDays: [...prev.productiveDays, todayISO()] },
    );

  return (
    <UserContext.Provider value={{ user, updateUser, recordProductiveDay, setScope }}>
      {children}
    </UserContext.Provider>
  );
};
