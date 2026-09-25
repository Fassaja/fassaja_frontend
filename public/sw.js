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

// Nome dos caches que a tentativa de offline deixou para trás ('fassaja-v1').
// A limpeza é restrita a este prefixo: `caches` é compartilhado por TODA a
// origem, e apagar tudo destruiria o cache de qualquer outra coisa servida do
// mesmo domínio.
const PREFIXO_DE_CACHE = 'fassaja';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(names =>
        Promise.all(
          names.filter(n => n.startsWith(PREFIXO_DE_CACHE)).map(n => caches.delete(n)),
        ),
      )
      .catch(() => undefined)
      .then(() => self.clients.claim()),
  );
});

// --- politica de URL (inicio) ---
// Cópia FIEL de `caminhoInternoSeguro` em src/utils/url.ts. É cópia, e não
// import, porque o worker é servido como está de /public: não passa pelo build,
// não conhece TypeScript nem os aliases do Vite.
// O teste test/swUrlPolicy.unit.mts extrai esta função do arquivo e compara o
// resultado dela com o do módulo TypeScript — se as duas divergirem, quebra.
function caminhoInternoSeguro(entrada) {
  var BASE_INTERNA = 'https://interno.invalid';
  var PROIBIDOS_RE = /[\u0000-\u001F\u007F\\]/;
  if (typeof entrada !== 'string' || entrada === '') return null;
  if (PROIBIDOS_RE.test(entrada)) return null;
  if (entrada.charAt(0) !== '/' || entrada.slice(0, 2) === '//') return null;
  var u;
  try {
    u = new URL(entrada, BASE_INTERNA);
  } catch (_e) {
    return null;
  }
  if (u.origin !== BASE_INTERNA || u.username || u.password) return null;
  var canonico = u.pathname + u.search + u.hash;
  if (canonico.charAt(0) !== '/' || canonico.slice(0, 2) === '//') return null;
  return canonico;
}
// --- politica de URL (fim) ---

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
    // Valida JÁ NA CHEGADA: guardar o valor cru e só conferir no clique deixaria
    // um destino inválido esperando dentro da notificação.
    data: { url: caminhoInternoSeguro(data.url) || '/agenda' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* Endereços que já foram o Fassajá e hoje não servem o site.
   Cópia FIEL de HOSTS_LEGADOS em src/utils/dominio.ts, pelo mesmo motivo da
   política de URL acima: este arquivo é servido como está de /public.
   test/dominioLegado.unit.mts compara os dois. */
var HOSTS_LEGADOS_SW = ['fassaja.vercel.app'];
var ORIGEM_CANONICA_SW = 'https://www.fassaja.com';

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const bruto = (event.notification.data && event.notification.data.url) || '/agenda';
  // De novo no ponto de uso. A checagem anterior era "começa com / e não com
  // //", que aprovava um caminho com barra invertida — o navegador a lê como
  // barra e abre outra origem.
  const caminho = caminhoInternoSeguro(bruto) || '/agenda';

  /* O clique abre na origem DESTE worker — e é aí que estava o defeito.
     Quem instalou o app quando o Fassajá morava em fassaja.vercel.app tem um
     service worker registrado LÁ. O backend manda o caminho ('/team'), o
     worker o abre no próprio domínio, e a pessoa cai num 404 da Vercel: a
     rota existe e funciona, o domínio é que não serve mais nada.

     Trocar o worker não resolveria sozinho (um worker num domínio morto não
     recebe atualização), mas o `openWindow` aceita outra origem — então o
     próprio clique pode levar para o lugar certo. */
  const legado = HOSTS_LEGADOS_SW.indexOf(self.location.hostname) !== -1;
  const url = legado ? ORIGEM_CANONICA_SW + caminho : caminho;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Numa origem legada não dá para reaproveitar a janela aberta:
      // `client.navigate` só funciona na MESMA origem, e a janela em questão
      // está no domínio morto. Abrir uma nova é o único caminho.
      if (!legado) {
        for (const client of list) {
          if ('focus' in client) {
            if ('navigate' in client) client.navigate(url);
            return client.focus();
          }
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});

/**
 * Encerramento de sessão pedido pela página (FE-03).
 *
 * O logout tira a inscrição de push, mas a notificação JÁ EXIBIDA continua na
 * bandeja do sistema, e uma entrega em trânsito ainda pode aparecer depois. A
 * página manda esta mensagem ao sair; o worker fecha o que estiver na tela.
 */
self.addEventListener('message', event => {
  if (!event.data || event.data.tipo !== 'fassaja:sessao-encerrada') return;
  event.waitUntil(
    self.registration
      .getNotifications()
      .then(list => list.forEach(n => n.close()))
      .catch(() => undefined),
  );
});
