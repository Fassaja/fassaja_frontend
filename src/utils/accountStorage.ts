/**
 * Chaves de localStorage por conta + limpeza no logout/expiração de sessão.
 *
 * Centralizado para que o encerramento de sessão apague TODA a PII espelhada no
 * navegador (e-mail, avatar, nome) — não só o "sinalizador" de sessão — sem
 * tocar nos dados de outras contas no mesmo dispositivo.
 *
 * As chaves espelham as definidas em UserContext (`fassaja_user_<id>`) e
 * NotificationsContext (`fassaja_notif_read_<id>`).
 */

const SESSION_KEY = 'fassaja_session';

export function userScopeKey(id: string): string {
  return `fassaja_user_${id}`;
}

export function notifReadKey(id: string): string {
  return `fassaja_notif_read_${id}`;
}

/**
 * Apaga o estado local de uma conta: sessão + perfil espelhado (PII) + estado
 * de notificações lidas. Se `id` não for informado, deriva da própria sessão
 * salva — cobre o handler de expiração, cujo closure pode ter um valor antigo.
 * Não remove dados de outras contas.
 */
export function clearAccountStorage(id?: string | null): void {
  try {
    let accountId = id ?? null;
    if (!accountId) {
      const raw = localStorage.getItem(SESSION_KEY);
      accountId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? null) : null;
    }
    localStorage.removeItem(SESSION_KEY);
    if (accountId) {
      localStorage.removeItem(userScopeKey(accountId));
      localStorage.removeItem(notifReadKey(accountId));
    }
  } catch {
    // localStorage indisponível ou JSON inválido — nada a fazer.
  }
}
