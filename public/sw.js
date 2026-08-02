/* Service worker do Fassaja — Web Push.
   Mostra a notificação quando o backend envia um push e leva à Agenda no clique.

   SEM handler de `fetch` — decisão consciente.
   Uma tentativa de cache offline aqui interceptava /assets/* e as imagens da
   raiz, e causou três regressões: mascotes sumindo das telas e a importação de
   PDF quebrando (o PDF.js carrega um Web Worker de /assets/, e worker de módulo
   servido através de um service worker falha em alguns navegadores).
   O ganho era conveniência; o custo foi funcionalidade que já funcionava.

   Para retomar o offline um dia, o pré-requisito é teste em navegador de
   verdade (Playwright), cobrindo: leitura de PDF, carregamento das imagens e
   um deploy novo chegando a quem já tem o SW instalado. Sem isso, não vale. */

// Mantido só para limpar caches deixados pelas versões que tentaram o offline.
// Sem isso, o que foi gravado antes ficaria no navegador de quem já visitou.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.map(n => caches.delete(n))))
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

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
    icon: '/icon-192.png',
    badge: '/icon-192.png',
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
