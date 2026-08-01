/* Service worker do Fassaja.
   1) Web Push: mostra a notificação e leva à Agenda no clique.
   2) Offline: guarda o "shell" do app para que abrir sem internet mostre o
      Fassaja em vez da tela de erro do navegador. */

// Suba a versão para invalidar o cache antigo num deploy.
const CACHE = 'fassaja-v1';

// Arquivos que valem a pena ter antes do primeiro offline. Os bundles com hash
// (/assets/*) não entram aqui — os nomes mudam a cada build e são guardados sob
// demanda pelo handler de fetch.
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/logofassaja.png'];

// Só cacheamos o build (/assets/*) e os estáticos da raiz (mascote, ícones).
// Isso mantém o dev-server do Vite intacto: lá nada casa com estas regras.
function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(png|jpe?g|gif|webp|svg|ico|webmanifest|woff2?)$/.test(url.pathname)
  );
}

// Só guarda respostas próprias e completas (nada de opaque/erro/parcial).
function isStorable(res) {
  return res && res.status === 200 && res.type === 'basic';
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // allSettled: um arquivo ausente não pode abortar a instalação inteira.
      Promise.allSettled(SHELL.map(path => cache.add(path))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // A API NUNCA é cacheada: as respostas são por usuário/sessão, e servir dados
  // velhos (ou de outra conta, num dispositivo compartilhado) é pior que falhar.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  // Navegação (abrir o app, recarregar, rota do SPA): rede primeiro, para sempre
  // pegar o deploy mais novo; sem rede, devolve o shell salvo.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (isStorable(res)) {
            const copy = res.clone();
            // Toda rota do SPA serve o mesmo index.html — guardamos sob '/'.
            caches.open(CACHE).then(cache => cache.put('/', copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return (
            cached ||
            new Response('<h1>Sem conexão</h1><p>Abra o Fassaja online ao menos uma vez.</p>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }),
    );
    return;
  }

  // Estáticos: cache primeiro (são versionados por hash, então não envelhecem),
  // buscando na rede e guardando na primeira vez.
  if (isCacheableAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        cached =>
          cached ||
          fetch(req).then(res => {
            if (isStorable(res)) {
              const copy = res.clone();
              caches.open(CACHE).then(cache => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
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
