import React, { createContext, useContext, useEffect, useState } from 'react';
import { mockUser } from '@/data/mockUser';

export interface NotificationPrefs {
  pending: boolean;
  deadline: boolean;
  daily: boolean;
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
}

interface UserContextValue {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  recordProductiveDay: () => void;
}

const STORAGE_KEY = 'fassaja_user';

const defaultUser: UserProfile = {
  name: 'Visitante',
  email: '',
  role: 'Conta visitante',
  avatar: undefined,
  dailyGoal: mockUser.dailyGoal,
  weeklyGoal: mockUser.weeklyGoal,
  notifications: { pending: true, deadline: true, daily: true },
  productiveDays: [],
};

function loadUser(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
});

export const useUser = () => useContext(UserContext);

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Maior sequência de dias consecutivos terminando hoje (ou ontem, se hoje ainda não teve conclusão). */
export function computeStreak(days: string[]): number {
  const set = new Set(days);
  const cursor = new Date();
  if (!set.has(todayISO())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (true) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (!set.has(iso)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Iniciais do nome para o avatar fallback. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(loadUser);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // armazenamento indisponível
    }
  }, [user]);

  const updateUser = (patch: Partial<UserProfile>) =>
    setUser(prev => ({ ...prev, ...patch }));

  const recordProductiveDay = () =>
    setUser(prev =>
      prev.productiveDays.includes(todayISO())
        ? prev
        : { ...prev, productiveDays: [...prev.productiveDays, todayISO()] },
    );

  return (
    <UserContext.Provider value={{ user, updateUser, recordProductiveDay }}>
      {children}
    </UserContext.Provider>
  );
};
