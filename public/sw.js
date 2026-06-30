/* Service worker do Fassaja — Web Push (Fase 1).
   Mostra a notificação quando o backend envia um push e leva à Agenda no clique. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'Fassaja', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Fassaja';
  const options = {
    body: data.body || '',
    icon: '/bobjoia.png',
    badge: '/bobjoia.png',
    tag: data.tag,
    data: { url: data.url || '/agenda' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/agenda';
  // Só caminhos internos: evita abrir origem/esquema externo a partir do payload de push.
  const url = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/agenda';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
