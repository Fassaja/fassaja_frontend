/**
 * Detecção de "esta pessoa usa o app instalado".
 *
 * Existe por causa do login com Google: ele sai do escopo do app, o sistema
 * abre o navegador, e a volta acontece lá — nenhuma API permite a uma página
 * trazer o navegador de volta para o app instalado. Sem um aviso, a pessoa vê
 * o Dashboard na aba e não tem pista de que basta voltar para o app.
 *
 * O risco aqui não é falhar em avisar, é avisar ERRADO: dizer "volte para o
 * app" a quem nunca instalou nada é pior do que ficar calado. Por isso os
 * controles negativos abaixo pesam mais que os positivos.
 *
 * Rodar: npm run test
 */
import {
  rodandoInstalado,
  registrarModoApp,
  deveSugerirVoltarAoApp,
} from '../src/utils/modoApp.ts';

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

const loja = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => loja.get(k) ?? null,
  setItem: (k: string, v: string) => void loja.set(k, v),
  removeItem: (k: string) => void loja.delete(k),
};

/** Simula o ambiente: instalado via display-mode, via iOS, ou navegador comum. */
function ambiente(modo: 'display-mode' | 'ios' | 'navegador') {
  (globalThis as unknown as { window: unknown }).window = {
    matchMedia: (q: string) => ({ matches: modo === 'display-mode' && q.includes('standalone') }),
  };
  // navigator é somente-leitura no Node; defineProperty é o jeito de trocá-lo.
  Object.defineProperty(globalThis, 'navigator', {
    value: { standalone: modo === 'ios' },
    configurable: true,
    writable: true,
  });
}

// --- Detecção do momento atual ---------------------------------------------
ambiente('display-mode');
check('detecta instalado por display-mode (Android/desktop)', rodandoInstalado());

ambiente('ios');
check('detecta instalado por navigator.standalone (iOS)', rodandoInstalado());

ambiente('navegador');
check('CONTROLE: aba comum não é "instalado"', !rodandoInstalado());

// --- A sugestão só aparece na combinação certa -----------------------------
loja.clear();
ambiente('navegador');
check(
  'nunca usou o app instalado: NÃO sugere (o caso que não pode dar falso positivo)',
  !deveSugerirVoltarAoApp(),
);

loja.clear();
ambiente('display-mode');
registrarModoApp();
check('rodar instalado deixa o registro', loja.size === 1);
check('DENTRO do app instalado não sugere voltar para ele', !deveSugerirVoltarAoApp());

// Mesma pessoa, agora na aba do navegador (é onde o login com Google termina).
ambiente('navegador');
check('na aba do navegador, com registro: SUGERE voltar ao app', deveSugerirVoltarAoApp());

// --- Registrar só acontece quando está instalado ---------------------------
loja.clear();
ambiente('navegador');
registrarModoApp();
check('rodar no navegador NÃO cria registro', loja.size === 0);
check('e portanto segue sem sugerir', !deveSugerirVoltarAoApp());

// --- Armazenamento indisponível não pode derrubar nada ---------------------
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: () => {
    throw new Error('bloqueado');
  },
  setItem: () => {
    throw new Error('bloqueado');
  },
  removeItem: () => {},
};
ambiente('navegador');
let quebrou = false;
try {
  registrarModoApp();
  check('storage bloqueado: não sugere nada', !deveSugerirVoltarAoApp());
} catch {
  quebrou = true;
}
check('storage bloqueado não lança', !quebrou);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
