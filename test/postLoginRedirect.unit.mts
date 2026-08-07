/**
 * Destino pós-login que sobrevive à ida ao Google.
 *
 * No modo redirect a aba sai do app e volta numa navegação nova, então o
 * destino precisa ficar guardado fora do React. O valor guardado é lido de
 * volta e vira uma NAVEGAÇÃO — por isso ele passa a ser entrada não confiável,
 * mesmo vindo do próprio armazenamento do navegador: qualquer script da origem
 * (uma extensão, um XSS, uma versão antiga do app) pode ter escrito ali.
 *
 * Este arquivo cobre as duas travas: só caminho interno (senão vira open
 * redirect, levando alguém logado para um site de terceiro logo depois de
 * autenticar) e prazo de validade.
 *
 * Rodar: npm run test
 */
import { guardarDestinoPosLogin, consumirDestinoPosLogin } from '../src/utils/postLoginRedirect.ts';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detalhe?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
    if (detalhe !== undefined) console.log('       recebido:', JSON.stringify(detalhe));
  }
}

// localStorage falso: o módulo roda em Node, sem navegador.
const loja = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => loja.get(k) ?? null,
  setItem: (k: string, v: string) => void loja.set(k, v),
  removeItem: (k: string) => void loja.delete(k),
};
const KEY = 'fassaja_pos_login';

// --- Caminho normal --------------------------------------------------------
guardarDestinoPosLogin('/reports');
check('guarda e devolve um caminho interno', consumirDestinoPosLogin() === '/reports');

// --- Consumo é destrutivo --------------------------------------------------
guardarDestinoPosLogin('/team');
consumirDestinoPosLogin();
check(
  'o destino é consumido uma vez só (o segundo login não herda o anterior)',
  consumirDestinoPosLogin() === '/',
);

// --- Nada guardado ---------------------------------------------------------
loja.clear();
check('sem nada guardado, cai no Dashboard', consumirDestinoPosLogin() === '/');

// --- Open redirect: o que este arquivo existe para impedir -----------------
for (const hostil of [
  'https://site-do-atacante.com',
  '//site-do-atacante.com',
  'http://site-do-atacante.com/x',
  'javascript:alert(1)',
  '\\\\site-do-atacante.com',
  'data:text/html,<script>alert(1)</script>',
]) {
  loja.clear();
  guardarDestinoPosLogin(hostil);
  check(`não guarda destino externo: ${hostil.slice(0, 32)}`, loja.size === 0);
}

// Mesmo escrito DIRETO no armazenamento (que é o cenário real de abuso — o
// atacante não passa pela nossa função), a leitura tem de recusar.
for (const hostil of ['https://site-do-atacante.com', '//site-do-atacante.com']) {
  loja.clear();
  loja.set(KEY, JSON.stringify({ path: hostil, ts: Date.now() }));
  check(
    `recusa destino externo plantado no storage: ${hostil.slice(0, 28)}`,
    consumirDestinoPosLogin() === '/',
  );
  check('e apaga o valor plantado', loja.size === 0);
}

// --- Validade --------------------------------------------------------------
loja.clear();
loja.set(KEY, JSON.stringify({ path: '/reports', ts: Date.now() - 11 * 60 * 1000 }));
check('destino vencido (11 min) é ignorado', consumirDestinoPosLogin() === '/');

loja.clear();
loja.set(KEY, JSON.stringify({ path: '/reports', ts: Date.now() - 5 * 60 * 1000 }));
check('CONTROLE: destino recente (5 min) ainda vale', consumirDestinoPosLogin() === '/reports');

// --- Lixo no armazenamento não pode derrubar o login -----------------------
for (const lixo of ['{', 'null', '[]', '{"path":123}', '{"path":"/ok"}']) {
  loja.clear();
  loja.set(KEY, lixo);
  let quebrou = false;
  let r = '';
  try {
    r = consumirDestinoPosLogin();
  } catch {
    quebrou = true;
  }
  check(`lixo no storage não lança: ${lixo}`, !quebrou && r === '/', { quebrou, r });
}

// '/' não é guardado: é o padrão, guardar só deixaria lixo para trás.
loja.clear();
guardarDestinoPosLogin('/');
check('não guarda o destino padrão', loja.size === 0);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
