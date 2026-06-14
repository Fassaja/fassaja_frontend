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
}

interface UserContextValue {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
}

const STORAGE_KEY = 'fassaja_user';

const defaultUser: UserProfile = {
  name: mockUser.name,
  email: mockUser.email,
  role: 'Administrador',
  avatar: undefined,
  dailyGoal: mockUser.dailyGoal,
  weeklyGoal: mockUser.weeklyGoal,
  notifications: { pending: true, deadline: true, daily: true },
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
});

export const useUser = () => useContext(UserContext);

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

  return (
    <UserContext.Provider value={{ user, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};
