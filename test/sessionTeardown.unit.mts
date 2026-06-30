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
  key: () => null,
  length: 0,
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
