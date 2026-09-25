/**
 * FE-05 — o service worker publicado usa a MESMA política de URL do app.
 *
 * O worker é servido cru de /public: não passa pelo build e não pode importar
 * TypeScript. A política, portanto, é uma cópia — e cópia diverge. Este teste
 * extrai a função do arquivo publicado, roda os mesmos casos do módulo
 * TypeScript e falha se as duas discordarem em qualquer um.
 *
 * Também exercita os handlers reais de `push`, `notificationclick`, `activate`
 * e `message` com dublês de ServiceWorkerRegistration/clients/caches.
 *
 * Rodar: npm run test
 */
import { readFileSync } from 'node:fs';
import { caminhoInternoSeguro } from '../src/utils/url.ts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

const fonte = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

// --- 1) paridade da política -------------------------------------------
const trecho = fonte.split('// --- politica de URL (inicio) ---')[1]?.split('// --- politica de URL (fim) ---')[0];
check('o bloco da política existe no sw.js', typeof trecho === 'string' && trecho.includes('caminhoInternoSeguro'));

const doWorker = new Function(`${trecho}; return caminhoInternoSeguro;`)() as (e: unknown) => string | null;

const NUL = String.fromCharCode(0);
const DEL = String.fromCharCode(127);
const CASOS: unknown[] = [
  '/agenda',
  '/',
  '/agenda?dia=2026-09-07',
  '/tasks#hoje',
  '//evil.com',
  '/\\evil.com',
  '/\\host',
  '/\tevil.com',
  '/\nevil.com',
  '/\revil.com',
  `/${NUL}evil.com`,
  `/${DEL}evil.com`,
  'https://evil.com',
  'javascript:alert(1)',
  'data:text/html,x',
  'agenda',
  '',
  '/a/../b',
  '/%09/agenda',
  null,
  undefined,
  42,
  { url: '/agenda' },
];
for (const caso of CASOS) {
  const esperado = caminhoInternoSeguro(caso);
  check(
    `worker e app concordam em ${JSON.stringify(caso)} => ${JSON.stringify(esperado)}`,
    doWorker(caso) === esperado,
  );
}

// --- 2) handlers reais ---------------------------------------------------
type Handler = (event: unknown) => void;
const handlers: Record<string, Handler> = {};
const notificacoesAbertas: Array<{ fechada: boolean; close: () => void }> = [];
const mostradas: Array<{ title: string; options: { data: { url: string } } }> = [];
const cachesApagados: string[] = [];
const navegacoes: string[] = [];
const abertas: string[] = [];

function novaNotificacao() {
  const n = { fechada: false, close: () => { n.fechada = true; } };
  notificacoesAbertas.push(n);
  return n;
}

const selfFalso = {
  addEventListener: (tipo: string, fn: Handler) => { handlers[tipo] = fn; },
  skipWaiting: () => undefined,
  // O worker real SEMPRE tem `location`, e o clique agora a consulta para
  // saber se está num domínio aposentado. Sem isto no dublê, o handler
  // quebrava aqui e passava lá.
  location: { hostname: 'www.fassaja.com' },
  registration: {
    showNotification: (title: string, options: { data: { url: string } }) => {
      mostradas.push({ title, options });
      novaNotificacao();
      return Promise.resolve();
    },
    getNotifications: () => Promise.resolve(notificacoesAbertas),
  },
  clients: {
    claim: () => Promise.resolve(),
    matchAll: () => Promise.resolve(clientesAbertos),
    openWindow: (u: string) => { abertas.push(u); return Promise.resolve(); },
  },
};
let clientesAbertos: Array<{ focus: () => void; navigate: (u: string) => void }> = [];

const cachesFalso = {
  keys: () => Promise.resolve(['fassaja-v1', 'outro-app-v3', 'fassaja-antigo']),
  delete: (n: string) => { cachesApagados.push(n); return Promise.resolve(true); },
};

const pendentes: Promise<unknown>[] = [];
function evento(extra: Record<string, unknown>) {
  return { waitUntil: (p: Promise<unknown>) => pendentes.push(p), ...extra };
}

new Function('self', 'caches', 'URL', fonte)(selfFalso, cachesFalso, URL);
check('o sw registrou push/notificationclick/activate/message',
  ['push', 'notificationclick', 'activate', 'message'].every(t => typeof handlers[t] === 'function'));

// activate: apaga só o que é nosso.
handlers.activate(evento({}));
await Promise.all(pendentes.splice(0));
check('activate apaga os caches do Fassaja', cachesApagados.includes('fassaja-v1') && cachesApagados.includes('fassaja-antigo'));
check('activate NÃO apaga cache de outra aplicação da origem', !cachesApagados.includes('outro-app-v3'));

// push: destino hostil vira /agenda já na chegada.
for (const [rotulo, urlDoPayload, esperado] of [
  ['destino interno normal', '/agenda?dia=1', '/agenda?dia=1'],
  ['barra invertida', '/\\host', '/agenda'],
  ['protocol-relative', '//evil.com', '/agenda'],
  ['TAB', '/\tevil.com', '/agenda'],
  ['esquema externo', 'https://evil.com', '/agenda'],
  ['sem url', undefined, '/agenda'],
] as const) {
  mostradas.length = 0;
  handlers.push(evento({ data: { json: () => ({ title: 'x', body: 'y', url: urlDoPayload }) } }));
  await Promise.all(pendentes.splice(0));
  check(`push guarda destino seguro (${rotulo})`, mostradas[0]?.options.data.url === esperado);
}

// notificationclick: mesmo com um destino hostil injetado na notificação.
for (const [rotulo, guardado, esperado] of [
  ['interno', '/agenda', '/agenda'],
  ['barra invertida', '/\\host', '/agenda'],
  ['TAB', '/\thost', '/agenda'],
  ['externo', 'https://evil.com/x', '/agenda'],
] as const) {
  navegacoes.length = 0;
  clientesAbertos = [{ focus: () => undefined, navigate: (u: string) => navegacoes.push(u) }];
  handlers.notificationclick(evento({ notification: { close: () => undefined, data: { url: guardado } } }));
  await Promise.all(pendentes.splice(0));
  check(`clique navega para destino seguro (${rotulo})`, navegacoes[0] === esperado);
}

// Sem janela aberta: cai no openWindow, com a mesma régua.
abertas.length = 0;
clientesAbertos = [];
handlers.notificationclick(evento({ notification: { close: () => undefined, data: { url: '/\\host' } } }));
await Promise.all(pendentes.splice(0));
check('openWindow também recebe destino seguro', abertas[0] === '/agenda');

// --- 3) domínio aposentado ----------------------------------------------
/*
 * Quem instalou o app quando o Fassajá morava em fassaja.vercel.app tem um
 * service worker registrado LÁ. O backend manda o caminho ('/team'), o worker
 * o abria na própria origem, e a pessoa caía num 404 da Vercel — a rota
 * existe e responde 200 no domínio de verdade.
 *
 * O worker é instanciado de novo, com outro hostname: é a única forma de
 * exercitar o caminho que só existe fora do domínio canônico.
 */
const abertasNoLegado: string[] = [];
const navegadasNoLegado: string[] = [];
const handlersLegado: Record<string, Handler> = {};
const pendentesLegado: Promise<unknown>[] = [];
const selfLegado = {
  ...selfFalso,
  addEventListener: (tipo: string, fn: Handler) => { handlersLegado[tipo] = fn; },
  location: { hostname: 'fassaja.vercel.app' },
  clients: {
    claim: () => Promise.resolve(),
    matchAll: () => Promise.resolve([
      { focus: () => undefined, navigate: (u: string) => navegadasNoLegado.push(u) },
    ]),
    openWindow: (u: string) => { abertasNoLegado.push(u); return Promise.resolve(); },
  },
};
new Function('self', 'caches', 'URL', fonte)(selfLegado, cachesFalso, URL);
handlersLegado.notificationclick({
  waitUntil: (pr: Promise<unknown>) => pendentesLegado.push(pr),
  notification: { close: () => undefined, data: { url: '/team' } },
});
await Promise.all(pendentesLegado.splice(0));
check(
  'no domínio aposentado o clique abre no domínio de verdade',
  abertasNoLegado[0] === 'https://www.fassaja.com/team',
);
check(
  'e não reaproveita a janela do domínio morto',
  // `client.navigate` só funciona na MESMA origem: insistir nela deixaria a
  // pessoa parada no 404, com a notificação já consumida.
  navegadasNoLegado.length === 0,
);

// message: o logout fecha o que já está na bandeja.
notificacoesAbertas.length = 0;
const n1 = novaNotificacao();
const n2 = novaNotificacao();
handlers.message(evento({ data: { tipo: 'fassaja:sessao-encerrada' } }));
await Promise.all(pendentes.splice(0));
check('sessão encerrada fecha as notificações exibidas', n1.fechada && n2.fechada);

notificacoesAbertas.length = 0;
const n3 = novaNotificacao();
handlers.message(evento({ data: { tipo: 'outra-coisa' } }));
await Promise.all(pendentes.splice(0));
check('mensagem desconhecida não fecha nada', n3.fechada === false);

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
