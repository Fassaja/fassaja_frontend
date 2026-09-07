import { api } from './api';

/**
 * A qual CONTA pertence a inscrição de push deste navegador.
 *
 * O `PushManager` só sabe que existe uma inscrição — não de quem ela é. Sem
 * este vínculo, quem entrasse na conta B num aparelho onde A ficou inscrito
 * veria "notificações ativadas" falando da inscrição de A (FE-03).
 *
 * Não é segredo nem PII sensível: é um id de conta usado como chave de
 * comparação, o mesmo que já está na sessão espelhada.
 */
const CHAVE_DA_CONTA = 'fassaja_push_conta';

function lerContaInscrita(): string | null {
  try {
    return localStorage.getItem(CHAVE_DA_CONTA);
  } catch {
    return null;
  }
}

function gravarContaInscrita(contaId: string | null): void {
  try {
    if (contaId) localStorage.setItem(CHAVE_DA_CONTA, contaId);
    else localStorage.removeItem(CHAVE_DA_CONTA);
  } catch {
    /* armazenamento indisponível: o vínculo se perde e a UI mostra desativado */
  }
}

// VAPID base64url -> Uint8Array (formato exigido pelo PushManager).
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

// iOS (incl. iPad "desktop") — push só funciona em PWA instalado na tela.
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// App rodando como PWA instalado (standalone)?
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported';
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js'); // idempotente
  return navigator.serviceWorker.ready;
}

/**
 * Pede ao service worker que feche as notificações já exibidas.
 *
 * O desligamento da inscrição não apaga o que já está na bandeja do sistema:
 * sem isto, quem sai da conta deixa o conteúdo dela na tela do aparelho.
 */
async function fecharNotificacoesExibidas(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    // Direto pelo registro quando dá (mais confiável que a mensagem), e a
    // mensagem como reforço para o worker que já está controlando a página.
    const abertas = await reg.getNotifications();
    abertas.forEach(n => n.close());
    reg.active?.postMessage({ tipo: 'fassaja:sessao-encerrada' });
  } catch {
    /* sem worker, sem permissão ou navegador sem suporte: nada a fechar */
  }
}

export const pushService = {
  async getPublicKey(): Promise<string> {
    const res = await api.get<{ publicKey: string; enabled: boolean }>('/push/public-key');
    return res.enabled ? res.publicKey : '';
  },

  /**
   * Pede permissão e inscreve este dispositivo NA CONTA informada.
   *
   * Só é chamado a partir de um gesto explícito (botão de ativar, ligar um
   * lembrete) — nunca no login: pedir permissão de notificação sem que a
   * pessoa tenha pedido é o caminho mais curto para o bloqueio permanente.
   */
  async enable(contaId: string | null | undefined): Promise<boolean> {
    if (!pushSupported()) return false;
    if (!contaId) return false; // visitante não tem onde o servidor guardar
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const key = await this.getPublicKey();
    if (!key) return false; // backend sem VAPID configurado

    const reg = await getRegistration();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
    await api.post<void>('/push/subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
    gravarContaInscrita(contaId);
    return true;
  },

  /** Cancela a inscrição deste dispositivo (ação manual de desativar). */
  async disable(): Promise<void> {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api.post<void>('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    gravarContaInscrita(null);
  },

  /**
   * Desliga o push ao encerrar a sessão (FE-03).
   *
   * Ordem importa: a remoção no servidor precisa da credencial, então acontece
   * ANTES da revogação do cookie. O vínculo local e a inscrição do navegador
   * caem de qualquer jeito — inclusive se a rede falhar —, porque manter a
   * inscrição viva num aparelho de onde alguém acabou de sair é justamente o
   * risco. Nunca lança: a saída não pode ficar presa esperando a rede.
   *
   * Devolve 'ok' quando o servidor confirmou a remoção e 'local' quando só deu
   * para desfazer deste lado — quem chama decide o que dizer à pessoa.
   */
  async desligarNoLogout(): Promise<'ok' | 'local' | 'nada'> {
    // O vínculo sai primeiro: mesmo que tudo abaixo falhe, a próxima conta não
    // herda o "ativado" da anterior.
    gravarContaInscrita(null);
    if (!pushSupported()) return 'nada';

    let resultado: 'ok' | 'local' | 'nada' = 'nada';
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        resultado = 'local';
        try {
          await api.post<void>('/push/unsubscribe', { endpoint: sub.endpoint });
          resultado = 'ok';
        } catch {
          // Servidor fora do ar ou sessão já revogada: a inscrição pode
          // continuar existindo lá. Ver SECURITY.md — o contrato pedido ao
          // backend é apagar as inscrições do dispositivo no logout.
        }
        await sub.unsubscribe().catch(() => undefined);
      }
    } catch {
      /* navegador sem worker registrado: nada a desligar */
    }
    await fecharNotificacoesExibidas();
    return resultado;
  },

  /**
   * Este dispositivo está inscrito PARA ESTA CONTA e com permissão concedida?
   *
   * A checagem do vínculo é o que impede a conta B de ver "ativado" por causa
   * de uma inscrição que é da conta A.
   */
  async isEnabled(contaId: string | null | undefined): Promise<boolean> {
    if (!pushSupported() || Notification.permission !== 'granted') return false;
    if (!contaId || lerContaInscrita() !== contaId) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  },
};
