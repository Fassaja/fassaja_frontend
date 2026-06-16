const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api';
const SESSION_KEY = 'fassaja_session';

// O token de sessão fica num cookie httpOnly (inacessível ao JavaScript), enviado
// automaticamente pelo navegador. Aqui guardamos só um sinalizador de "logado"
// para saber quando um 401 significa sessão expirada.
let authed = (() => {
  try {
    return !!localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
})();

export function setAuthenticated(value: boolean): void {
  authed = value;
}

// Disparado quando um request autenticado recebe 401 (sessão expirada/inválida).
// O AuthContext escuta para encerrar a sessão e levar ao /login.
export const SESSION_EXPIRED_EVENT = 'fassaja:session-expired';

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body } = options;

  const headers: Record<string, string> = {};
  if (body) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
    // Envia/recebe o cookie de sessão httpOnly.
    credentials: 'include',
  });

  // Sessão expirada/inválida num request autenticado (fora das rotas de auth):
  // encerra a sessão localmente e avisa a aplicação.
  if (response.status === 401 && authed && !path.startsWith('/auth/')) {
    authed = false;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const data = await response.json();
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      }
    } catch {
      // resposta sem corpo JSON
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
