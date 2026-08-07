/**
 * Telas que ficam sempre no tema claro (login, cadastro, recuperação de senha).
 *
 * O ponto frágil que este arquivo protege é a DUPLICAÇÃO: a lista de caminhos
 * existe em src/utils/lightOnlyRoutes.ts e precisa existir de novo em
 * public/theme-init.js, que roda antes do bundle e não pode importar nada.
 * Se as duas divergirem, quem usa tema escuro vê um flash escuro no primeiro
 * paint do login — um defeito que dura uma fração de segundo e não aparece em
 * nenhum log.
 *
 * Em vez de comparar strings de longe, o teste EXECUTA o theme-init.js de
 * verdade, com localStorage e matchMedia falsos, e olha o que ele fez com o
 * <html>. Assim ele testa o arquivo que vai para produção, não uma cópia.
 *
 * Rodar: npm run test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { LIGHT_ONLY_PATHS, isLightOnlyPath } from '../src/utils/lightOnlyRoutes.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const THEME_INIT = readFileSync(join(aqui, '..', 'public', 'theme-init.js'), 'utf8');

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

/**
 * Roda o theme-init.js real e devolve se ele aplicou o tema escuro.
 * `pref` null = ninguém escolheu nada ainda (primeira visita).
 */
function rodarThemeInit(opts: {
  pathname: string;
  pref: string | null;
  sistemaEscuro: boolean;
}): boolean {
  let temDark = false;
  const documentFake = {
    documentElement: {
      classList: {
        add: (c: string) => {
          if (c === 'dark') temDark = true;
        },
      },
    },
  };
  const windowFake = {
    matchMedia: (q: string) => ({ matches: q.includes('dark') && opts.sistemaEscuro }),
  };
  const localStorageFake = { getItem: () => opts.pref };
  const locationFake = { pathname: opts.pathname };

  // Function em vez de eval: dá para injetar os globais como parâmetros, sem
  // sujar o escopo do teste nem precisar de jsdom.
  new Function('window', 'document', 'localStorage', 'location', THEME_INIT)(
    windowFake,
    documentFake,
    localStorageFake,
    locationFake,
  );
  return temDark;
}

// --- As duas listas dizem a mesma coisa ------------------------------------
// Lê a lista de dentro do theme-init.js e compara com a fonte única em TS.
const trecho = THEME_INIT.match(/LIGHT_ONLY\s*=\s*\[([^\]]*)\]/);
check('theme-init.js declara a lista de caminhos', trecho !== null);

const doInit = (trecho?.[1] ?? '')
  .split(',')
  .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
  .filter(Boolean);

check(
  'as duas listas têm os MESMOS caminhos',
  JSON.stringify([...doInit].sort()) === JSON.stringify([...LIGHT_ONLY_PATHS].sort()),
  { theme_init: doInit, typescript: LIGHT_ONLY_PATHS },
);

// --- O anti-flash respeita as telas claras ---------------------------------
for (const p of LIGHT_ONLY_PATHS) {
  check(
    `${p}: NÃO fica escuro nem com preferência 'dark' salva`,
    rodarThemeInit({ pathname: p, pref: 'dark', sistemaEscuro: true }) === false,
  );
  check(
    `${p}: NÃO fica escuro com sistema escuro e sem preferência`,
    rodarThemeInit({ pathname: p, pref: null, sistemaEscuro: true }) === false,
  );
}

// --- CONTROLE: fora dessas telas, o tema escuro continua funcionando --------
// Sem estas checagens, um theme-init que nunca aplicasse 'dark' passaria em
// tudo acima — o teste estaria medindo a ausência de comportamento.
check(
  'CONTROLE /: preferência dark aplica escuro',
  rodarThemeInit({ pathname: '/', pref: 'dark', sistemaEscuro: false }) === true,
);
check(
  'CONTROLE /tasks: sistema escuro sem preferência aplica escuro',
  rodarThemeInit({ pathname: '/tasks', pref: null, sistemaEscuro: true }) === true,
);
check(
  'CONTROLE /tasks: preferência light vence o sistema escuro',
  rodarThemeInit({ pathname: '/tasks', pref: 'light', sistemaEscuro: true }) === false,
);
check(
  'CONTROLE /settings: sistema claro segue claro',
  rodarThemeInit({ pathname: '/settings', pref: 'system', sistemaEscuro: false }) === false,
);

// Caminho parecido não pode ser confundido com tela de login.
check(
  'CONTROLE /login-algo-mais NÃO é tratado como tela clara',
  rodarThemeInit({ pathname: '/login-algo-mais', pref: 'dark', sistemaEscuro: false }) === true,
);

// --- O helper de TS concorda com o comportamento real ----------------------
for (const p of LIGHT_ONLY_PATHS) check(`isLightOnlyPath('${p}')`, isLightOnlyPath(p));
for (const p of ['/', '/tasks', '/settings', '/loginx', '/login/'])
  check(`isLightOnlyPath('${p}') é falso`, !isLightOnlyPath(p));

// --- localStorage bloqueado não pode derrubar a página ---------------------
{
  let quebrou = false;
  try {
    const documentFake = { documentElement: { classList: { add: () => {} } } };
    new Function('window', 'document', 'localStorage', 'location', THEME_INIT)(
      { matchMedia: () => ({ matches: false }) },
      documentFake,
      {
        getItem: () => {
          throw new Error('bloqueado');
        },
      },
      { pathname: '/' },
    );
  } catch {
    quebrou = true;
  }
  check('localStorage bloqueado não lança erro', !quebrou);
}

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
