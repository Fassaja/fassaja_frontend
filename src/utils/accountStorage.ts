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
const USER_PREFIX = 'fassaja_user_';
const NOTIF_PREFIX = 'fassaja_notif_read_';

/** Remoção que nunca derruba a limpeza inteira por causa de uma chave. */
function remover(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // Armazenamento indisponível: segue para as próximas chaves.
  }
}

export function userScopeKey(id: string): string {
  return `${USER_PREFIX}${id}`;
}

export function notifReadKey(id: string): string {
  return `${NOTIF_PREFIX}${id}`;
}

/**
 * Apaga o estado local de uma conta: sessão + perfil espelhado (PII) + estado
 * de notificações lidas. Se `id` não for informado, deriva da própria sessão
 * salva — cobre o handler de expiração, cujo closure pode ter um valor antigo.
 *
 * Com um id conhecido, não toca nos dados de outras contas do mesmo aparelho.
 * Sem id nenhum (sessão corrompida), varre o espelho de todas: é o único jeito
 * de não deixar PII de alguém para trás num aparelho compartilhado.
 */
export function clearAccountStorage(id?: string | null): void {
  let accountId = id ?? null;

  // A DESCOBERTA do id fica no seu próprio try. Antes, parse e remoção
  // dividiam o mesmo bloco: uma sessão corrompida no localStorage (JSON
  // inválido, gravado por uma versão antiga ou por outra aba) fazia o
  // `JSON.parse` lançar ANTES do `removeItem`, e a saída terminava sem apagar
  // nada — justamente no caso em que o estado local já não é confiável.
  if (!accountId) {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      accountId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? null) : null;
    } catch {
      // Sem id: a sessão sai de qualquer forma; o perfil espelhado de uma conta
      // que não dá para identificar é limpo pela varredura abaixo.
      accountId = null;
    }
  }

  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Armazenamento indisponível (modo privado, cota, política do navegador).
  }

  if (accountId) {
    remover(userScopeKey(accountId));
    remover(notifReadKey(accountId));
    return;
  }

  // Sem id conhecido: apaga o espelho de TODAS as contas deste navegador.
  //
  // Parece exagero, e é deliberado: aqui já se sabe que a sessão acabou e que a
  // identidade se perdeu. Deixar `fassaja_user_<id>` para trás guardaria nome,
  // e-mail e avatar de alguém num aparelho que pode ser de outra pessoa. O
  // custo é reentrar e recarregar preferências; o custo do contrário é PII
  // esquecida.
  try {
    const chaves: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(`${USER_PREFIX}`) || k.startsWith(`${NOTIF_PREFIX}`))) {
        chaves.push(k);
      }
    }
    chaves.forEach(remover);
  } catch {
    // localStorage indisponível — nada a varrer.
  }
}
