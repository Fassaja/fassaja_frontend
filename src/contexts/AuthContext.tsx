import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Lock } from 'lucide-react';
import { useUser } from './UserContext';

interface StoredAccount {
  name: string;
  email: string;
  password: string;
}

type AuthStatus = 'guest' | 'authed';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  isGuest: boolean;
  account: { name: string; email: string } | null;
  login: (email: string, password: string) => AuthResult;
  register: (name: string, email: string, password: string) => AuthResult;
  changePassword: (current: string, next: string) => AuthResult;
  logout: () => void;
  guestTaskLimit: number;
  guestTaskCount: number;
  noteGuestTask: () => void;
  requireAuth: (reason?: string) => void;
}

const ACCOUNTS_KEY = 'fassaja_accounts';
const SESSION_KEY = 'fassaja_session';
const GUEST_KEY = 'fassaja_guest_tasks';
const GUEST_TASK_LIMIT = 3;

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { updateUser } = useUser();

  const [account, setAccount] = useState<{ name: string; email: string } | null>(() => {
    const session = readJSON<{ email: string } | null>(SESSION_KEY, null);
    if (!session) return null;
    const acc = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []).find(a => a.email === session.email);
    return acc ? { name: acc.name, email: acc.email } : null;
  });

  const [guest, setGuest] = useState<{ date: string; count: number }>(() => {
    const g = readJSON<{ date: string; count: number }>(GUEST_KEY, { date: todayISO(), count: 0 });
    return g.date === todayISO() ? g : { date: todayISO(), count: 0 };
  });

  const [prompt, setPrompt] = useState<string | null>(null);

  const status: AuthStatus = account ? 'authed' : 'guest';

  // Sem sessão = visitante: garante a identidade "Visitante" mesmo que tenha
  // sobrado um nome de uma sessão anterior no navegador.
  useEffect(() => {
    if (!account) {
      updateUser({ name: 'Visitante', email: '', role: 'Conta visitante', avatar: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = (email: string | null) =>
    email
      ? localStorage.setItem(SESSION_KEY, JSON.stringify({ email }))
      : localStorage.removeItem(SESSION_KEY);

  const login = (email: string, password: string): AuthResult => {
    const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const acc = accounts.find(a => a.email.toLowerCase() === email.trim().toLowerCase());
    if (!acc) return { ok: false, error: 'Não encontramos uma conta com esse e-mail.' };
    if (acc.password !== password) return { ok: false, error: 'Senha incorreta.' };
    persistSession(acc.email);
    setAccount({ name: acc.name, email: acc.email });
    updateUser({ name: acc.name, email: acc.email });
    return { ok: true };
  };

  const register = (name: string, email: string, password: string): AuthResult => {
    const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    if (accounts.some(a => a.email.toLowerCase() === email.trim().toLowerCase())) {
      return { ok: false, error: 'Já existe uma conta com esse e-mail.' };
    }
    const acc: StoredAccount = { name: name.trim(), email: email.trim(), password };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...accounts, acc]));
    persistSession(acc.email);
    setAccount({ name: acc.name, email: acc.email });
    updateUser({ name: acc.name, email: acc.email });
    return { ok: true };
  };

  const changePassword = (current: string, next: string): AuthResult => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    const accounts = readJSON<StoredAccount[]>(ACCOUNTS_KEY, []);
    const idx = accounts.findIndex(a => a.email === account.email);
    if (idx === -1) return { ok: false, error: 'Conta não encontrada.' };
    if (accounts[idx].password !== current) return { ok: false, error: 'Senha atual incorreta.' };
    if (next.length < 4) return { ok: false, error: 'A nova senha deve ter ao menos 4 caracteres.' };
    accounts[idx] = { ...accounts[idx], password: next };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    return { ok: true };
  };

  const logout = () => {
    persistSession(null);
    setAccount(null);
    updateUser({ name: 'Visitante', email: '', avatar: undefined, role: 'Conta visitante' });
    navigate('/login');
  };

  const noteGuestTask = () =>
    setGuest(prev => {
      const base = prev.date === todayISO() ? prev : { date: todayISO(), count: 0 };
      const next = { date: todayISO(), count: base.count + 1 };
      localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      return next;
    });

  const requireAuth = (reason?: string) =>
    setPrompt(reason ?? 'Crie uma conta gratuita para liberar todos os recursos.');

  const guestTaskCount = guest.date === todayISO() ? guest.count : 0;

  return (
    <AuthContext.Provider
      value={{
        status,
        isGuest: status === 'guest',
        account,
        login,
        register,
        changePassword,
        logout,
        guestTaskLimit: GUEST_TASK_LIMIT,
        guestTaskCount,
        noteGuestTask,
        requireAuth,
      }}
    >
      {children}

      <ConfirmDialog
        isOpen={prompt !== null}
        title="Entre para continuar"
        message={prompt ?? ''}
        confirmLabel="Entrar ou criar conta"
        cancelLabel="Agora não"
        tone="primary"
        icon={<Lock size={24} />}
        onConfirm={() => navigate('/login')}
        onClose={() => setPrompt(null)}
      />
    </AuthContext.Provider>
  );
};
