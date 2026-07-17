import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Lock } from 'lucide-react';
import { useUser } from './UserContext';
import { api, setAuthenticated, SESSION_EXPIRED_EVENT } from '@/services/api';
import { getProductiveDays } from '@/services/authService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { clearAccountStorage } from '@/utils/accountStorage';

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  // Dias da sequência (0=domingo … 6=sábado). Fonte de verdade é o servidor;
  // hidratado no login e no /auth/me, espelhado no UserContext.
  streakDays?: number[];
  nameChangedAt?: string | null;
  passwordChangedAt?: string | null;
}

type AuthStatus = 'guest' | 'authed';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface RegisterResult extends AuthResult {
  needsVerification?: boolean;
  message?: string;
}

interface AuthResponse {
  token: string;
  user: Account;
}

interface AuthContextValue {
  status: AuthStatus;
  isGuest: boolean;
  account: Account | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  resendVerification: (email: string) => Promise<AuthResult>;
  changePassword: (current: string, next: string) => Promise<AuthResult>;
  updateName: (name: string) => Promise<AuthResult>;
  updateAvatar: (avatar: string | null) => Promise<AuthResult>;
  logout: () => void;
  guestTaskLimit: number;
  guestTaskCount: number;
  noteGuestTask: () => void;
  requireAuth: (reason?: string) => void;
}

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
  const { updateUser, setScope } = useUser();

  const [account, setAccount] = useState<Account | null>(() =>
    readJSON<Account | null>(SESSION_KEY, null),
  );

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
      setScope(null);
      updateUser({ name: 'Visitante', email: '', role: 'Conta visitante', avatar: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva a sessão. A limpeza (logout/expiração) é feita por clearAccountStorage,
  // que também apaga o perfil/notificações espelhados desta conta.
  const persistSession = (acc: Account) =>
    localStorage.setItem(SESSION_KEY, JSON.stringify(acc));

  // Persiste a conta e espelha nome/email/avatar/streakDays para o UserContext.
  // streakDays vem do servidor (fonte de verdade) e só é aplicado quando presente,
  // para não sobrescrever o valor local com um response que o omita.
  const syncAccount = (acc: Account) => {
    persistSession(acc);
    setAccount(acc);
    updateUser({
      name: acc.name,
      email: acc.email,
      role: 'Membro',
      avatar: acc.avatar ?? undefined,
      ...(Array.isArray(acc.streakDays) && acc.streakDays.length > 0
        ? { streakDays: acc.streakDays }
        : {}),
    });
  };

  // Busca os dias produtivos no servidor (fonte de verdade, sobrevive à faxina
  // de tarefas) e injeta no UserContext. Best-effort: em falha, o cache local
  // do localStorage segue valendo até a próxima hidratação.
  const hydrateProductiveDays = () => {
    getProductiveDays()
      .then(days => updateUser({ productiveDays: days }))
      .catch(() => undefined);
  };

  const adopt = (acc: Account) => {
    setAuthenticated(true);
    // Descarta a sandbox local do visitante ao assumir uma conta real.
    guestTasksStore.clear();
    setScope(acc.id); // carrega metas/preferências/sequência desta conta
    syncAccount(acc);
    hydrateProductiveDays();
  };

  // Ao montar logado, atualiza os dados a partir do banco (avatar, cooldowns).
  // Se o servidor disser que a sessão é inválida (401), encerra o estado local.
  // Logo após confirmar o e-mail (?verified=1), assume a sessão do cookie e entra no app.
  useEffect(() => {
    const justVerified = new URLSearchParams(window.location.search).get('verified') === '1';
    if (account) {
      setScope(account.id); // recarga já logado: carrega os dados desta conta
      api
        .get<Account>('/auth/me')
        .then(acc => {
          syncAccount(acc);
          hydrateProductiveDays();
        })
        .catch((err: Error & { status?: number }) => {
          if (err.status === 401) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        });
    } else if (justVerified) {
      api
        .get<Account>('/auth/me')
        .then(acc => {
          adopt(acc);
          navigate('/', { replace: true }); // logado: entra no app e limpa o ?verified=1
        })
        .catch(() => {
          // O cookie de sessão não chegou (ex.: deploy cross-domain em que o link
          // de verificação não passou pelo proxy do front). Em vez de deixar a
          // pessoa presa como visitante, leva à tela de login já confirmado.
          navigate('/login?verified=1', { replace: true });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await api.post<AuthResponse>('/auth/login', { email: email.trim(), password });
      adopt(res.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
  ): Promise<RegisterResult> => {
    try {
      // Não loga: o usuário precisa confirmar o e-mail antes.
      const res = await api.post<{ message: string }>('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      // Marca como usuário novo para abrir o tour de boas-vindas no 1º acesso.
      try {
        localStorage.setItem('fassaja_new_user', '1');
      } catch {
        /* ignora */
      }
      return { ok: true, needsVerification: true, message: res.message };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const resendVerification = async (email: string): Promise<AuthResult> => {
    try {
      await api.post('/auth/resend-verification', { email: email.trim() });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const changePassword = async (current: string, next: string): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const updated = await api.patch<Account>('/auth/password', { current, next });
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const updateName = async (name: string): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const updated = await api.patch<Account>('/auth/profile', { name: name.trim() });
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const updateAvatar = async (avatar: string | null): Promise<AuthResult> => {
    if (!account) return { ok: false, error: 'Faça login primeiro.' };
    try {
      const updated = avatar
        ? await api.patch<Account>('/auth/avatar', { avatar })
        : await api.delete<Account>('/auth/avatar');
      syncAccount(updated);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  };

  const logout = () => {
    // Limpa o cookie de sessão no servidor (best-effort).
    void api.post('/auth/logout', {}).catch(() => undefined);
    // Apaga toda a PII espelhada desta conta (sessão + perfil + notificações),
    // não só o sinalizador de sessão — evita resíduo em dispositivo compartilhado.
    clearAccountStorage(account?.id);
    setAuthenticated(false);
    setScope(null);
    setAccount(null);
    updateUser({ name: 'Visitante', email: '', avatar: undefined, role: 'Conta visitante' });
    navigate('/login');
  };

  // Sessão expirada (401 num request autenticado): encerra e leva ao login.
  useEffect(() => {
    const handler = () => {
      // Sem id no closure (efeito montado com []): clearAccountStorage deriva da
      // sessão salva para apagar também o perfil/notificações espelhados.
      clearAccountStorage();
      setAuthenticated(false);
      setScope(null);
      setAccount(null);
      updateUser({ name: 'Visitante', email: '', avatar: undefined, role: 'Conta visitante' });
      navigate('/login?expired=1');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noteGuestTask = () =>
    setGuest(prev => {
      const base = prev.date === todayISO() ? prev : { date: todayISO(), count: 0 };
      const next = { date: todayISO(), count: base.count + 1 };
      localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      return next;
    });

  const requireAuth = (reason?: string) =>
    setPrompt(
      reason ??
        'Este recurso é exclusivo para quem tem conta. Faça login (ou crie uma conta gratuita) para liberar tudo — ou continue explorando como visitante.',
    );

  const guestTaskCount = guest.date === todayISO() ? guest.count : 0;

  return (
    <AuthContext.Provider
      value={{
        status,
        isGuest: status === 'guest',
        account,
        login,
        register,
        resendVerification,
        changePassword,
        updateName,
        updateAvatar,
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
        title="Quer fazer login?"
        message={prompt ?? ''}
        confirmLabel="Fazer login"
        cancelLabel="Continuar como visitante"
        tone="primary"
        icon={<Lock size={24} />}
        onConfirm={() => navigate('/login')}
        onClose={() => setPrompt(null)}
      />
    </AuthContext.Provider>
  );
};
