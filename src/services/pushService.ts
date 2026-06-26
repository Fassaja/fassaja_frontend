import { api } from './api';

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

export const pushService = {
  async getPublicKey(): Promise<string> {
    const res = await api.get<{ publicKey: string; enabled: boolean }>('/push/public-key');
    return res.enabled ? res.publicKey : '';
  },

  /** Pede permissão e inscreve este dispositivo. Retorna true se ativou. */
  async enable(): Promise<boolean> {
    if (!pushSupported()) return false;
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
    return true;
  },

  /** Cancela a inscrição deste dispositivo. */
  async disable(): Promise<void> {
    if (!pushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await api.post<void>('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  },

  /** Este dispositivo já está inscrito e com permissão concedida? */
  async isEnabled(): Promise<boolean> {
    if (!pushSupported() || Notification.permission !== 'granted') return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  },
};
