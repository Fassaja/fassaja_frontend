/**
 * Testes do teardown de sessão (sem navegador). Garante que o logout/expiração
 * apaguem TODA a PII espelhada da conta (sessão + perfil + notificações lidas)
 * sem afetar outras contas no mesmo dispositivo. Rodar: npm run test
 */
import { clearAccountStorage } from '../src/utils/accountStorage.ts';

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

// localStorage falso para rodar fora do navegador.
const store: Record<string, string> = {};
// `key`/`length` de verdade: a limpeza sem id conhecido VARRE o armazenamento,
// e um dublê que responde sempre `null` esconderia essa parte do comportamento.
globalThis.localStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = String(v);
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
  get length() {
    return Object.keys(store).length;
  },
} as unknown as Storage;

function seed() {
  store['fassaja_session'] = JSON.stringify({ id: 'u1', email: 'a@b.com', avatar: 'data:image/jpeg;base64,AAA' });
  store['fassaja_user_u1'] = JSON.stringify({ email: 'a@b.com', avatar: 'data:image/jpeg;base64,AAA' });
  store['fassaja_notif_read_u1'] = JSON.stringify(['x']);
  store['fassaja_user_OUTRO'] = JSON.stringify({ email: 'outro@b.com' }); // não pode sumir
}

// 1) id explícito (caso do logout).
seed();
clearAccountStorage('u1');
check('apaga fassaja_session', store['fassaja_session'] === undefined);
check('apaga fassaja_user_<id> (e-mail/avatar)', store['fassaja_user_u1'] === undefined);
check('apaga fassaja_notif_read_<id>', store['fassaja_notif_read_u1'] === undefined);
check('preserva dados de outra conta', store['fassaja_user_OUTRO'] !== undefined);

// 2) sem id: deriva da sessão salva (caso do handler de expiração).
seed();
clearAccountStorage();
check('sem id: deriva da sessão e apaga PII do perfil', store['fassaja_user_u1'] === undefined);
check('sem id: apaga notificações lidas', store['fassaja_notif_read_u1'] === undefined);
check('sem id: preserva outra conta', store['fassaja_user_OUTRO'] !== undefined);

// 3) idempotente: sem sessão não quebra.
clearAccountStorage();
check('idempotente sem sessão', store['fassaja_session'] === undefined);

// 4) Sessão CORROMPIDA no localStorage.
//
// Antes, o parse e a remoção dividiam o mesmo `try`: o JSON inválido lançava
// antes do `removeItem` e a saída terminava sem apagar NADA — justamente no
// caso em que o estado local já não é confiável.
seed();
store['fassaja_session'] = '{isso não é json';
clearAccountStorage();
check('sessão corrompida ainda é apagada', store['fassaja_session'] === undefined);
check(
  'sem id identificável, o perfil espelhado também sai (PII em aparelho compartilhado)',
  store['fassaja_user_u1'] === undefined && store['fassaja_user_OUTRO'] === undefined,
);
check('e as notificações lidas também', store['fassaja_notif_read_u1'] === undefined);

// 5) Chave de outro domínio de dados não é varrida por engano.
seed();
store['fassaja_session'] = '{corrompido';
store['fassaja_tema'] = 'escuro';
clearAccountStorage();
check('preferência que não é PII de conta continua', store['fassaja_tema'] === 'escuro');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
