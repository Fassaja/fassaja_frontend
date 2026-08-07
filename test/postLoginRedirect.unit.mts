/**
 * A ida ao Google: a marca que sobrevive enquanto o app perde o controle.
 *
 * No modo redirect a aba sai do app e volta numa navegação nova, então duas
 * coisas precisam ficar guardadas fora do React: QUE há um login em andamento
 * (é o que autoriza o app a conferir a sessão ao voltar ao primeiro plano) e
 * PARA ONDE levar depois.
 *
 * O destino guardado vira uma NAVEGAÇÃO ao ser lido, então é entrada não
 * confiável mesmo vindo do próprio navegador: qualquer script da origem — uma
 * extensão, um XSS, uma versão antiga do app — pode ter escrito ali. Este
 * arquivo cobre as duas travas: só caminho interno (senão vira open redirect,
 * jogando alguém recém-autenticado num site de terceiro) e prazo de validade.
 *
 * Rodar: npm run test
 */
import {
  marcarIdaAoGoogle,
  idaAoGoogleEmAndamento,
  limparIdaAoGoogle,
  consumirDestinoPosLogin,
} from '../src/utils/postLoginRedirect.ts';

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
loja.clear();
marcarIdaAoGoogle('/reports');
check('a ida fica marcada', idaAoGoogleEmAndamento());
check('e devolve o caminho guardado', consumirDestinoPosLogin() === '/reports');
check('consumir encerra a ida', !idaAoGoogleEmAndamento());

// --- A marca existe mesmo quando o destino é o padrão ----------------------
// Este é o caso mais comum (login direto pela tela de login) e o que mais
// importa: sem a marca, o app não teria como saber que deve conferir a sessão
// ao voltar do Google — que é exatamente o bug do app instalado.
loja.clear();
marcarIdaAoGoogle('/');
check('ida para o destino padrão TAMBÉM fica marcada', idaAoGoogleEmAndamento());
check('e leva ao Dashboard', consumirDestinoPosLogin() === '/');

// --- Consumo é destrutivo --------------------------------------------------
loja.clear();
marcarIdaAoGoogle('/team');
consumirDestinoPosLogin();
check(
  'o destino é consumido uma vez só (o próximo login não herda o anterior)',
  consumirDestinoPosLogin() === '/',
);

// --- Limpeza explícita -----------------------------------------------------
loja.clear();
marcarIdaAoGoogle('/reports');
limparIdaAoGoogle();
check('limparIdaAoGoogle encerra a espera', !idaAoGoogleEmAndamento());
check('e o armazenamento fica vazio', loja.size === 0);

// --- Sem nada marcado ------------------------------------------------------
loja.clear();
check('sem nada marcado, não há ida em andamento', !idaAoGoogleEmAndamento());
check('e o destino é o Dashboard', consumirDestinoPosLogin() === '/');

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
  marcarIdaAoGoogle(hostil);
  check(
    `destino externo vira Dashboard na escrita: ${hostil.slice(0, 30)}`,
    consumirDestinoPosLogin() === '/',
  );
}

// Escrito DIRETO no armazenamento — o cenário real de abuso, em que o atacante
// não passa pela nossa função. A validação na LEITURA é a que vale aqui.
for (const hostil of ['https://site-do-atacante.com', '//site-do-atacante.com', '\\\\evil.com']) {
  loja.clear();
  loja.set(KEY, JSON.stringify({ path: hostil, ts: Date.now() }));
  check(
    `recusa destino externo plantado no storage: ${hostil.slice(0, 26)}`,
    consumirDestinoPosLogin() === '/',
  );
  check('e apaga o valor plantado', loja.size === 0);
}

// --- Validade --------------------------------------------------------------
loja.clear();
loja.set(KEY, JSON.stringify({ path: '/reports', ts: Date.now() - 11 * 60 * 1000 }));
check('ida vencida (11 min) não conta como em andamento', !idaAoGoogleEmAndamento());
check('e o destino vencido é ignorado', consumirDestinoPosLogin() === '/');

loja.clear();
loja.set(KEY, JSON.stringify({ path: '/reports', ts: Date.now() - 5 * 60 * 1000 }));
check('CONTROLE: ida recente (5 min) ainda vale', idaAoGoogleEmAndamento());
check('CONTROLE: e devolve o destino', consumirDestinoPosLogin() === '/reports');

// --- Lixo no armazenamento não pode derrubar o login -----------------------
for (const lixo of ['{', 'null', '[]', '{"path":123}', '{"path":"/ok"}', 'undefined']) {
  loja.clear();
  loja.set(KEY, lixo);
  let quebrou = false;
  let r = '';
  try {
    idaAoGoogleEmAndamento();
    r = consumirDestinoPosLogin();
  } catch {
    quebrou = true;
  }
  check(`lixo no storage não lança: ${lixo}`, !quebrou && r === '/', { quebrou, r });
}

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
