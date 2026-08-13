/**
 * Testes de quais rotas podem encerrar a sessão ao receber 401.
 * Rodar: npm run test
 */
import { isSessionExpiry } from '../src/utils/authPaths.ts';

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

// --- Regressão: o bug que deslogava ao errar a senha atual --------------
// /auth/password respondia 401 em "senha atual incorreta", e o cliente lia
// isso como sessão expirada.
check('/auth/password NÃO encerra a sessão', !isSessionExpiry('/auth/password'));

// --- Rotas de entrada: 401 é credencial inválida, não expiração ---------
check('/auth/login não encerra', !isSessionExpiry('/auth/login'));
check('/auth/register não encerra', !isSessionExpiry('/auth/register'));
check('/auth/verify não encerra', !isSessionExpiry('/auth/verify'));
check('/auth/logout não encerra', !isSessionExpiry('/auth/logout'));
check('/auth/me não encerra', !isSessionExpiry('/auth/me'));
check('/auth/forgot-password não encerra', !isSessionExpiry('/auth/forgot-password'));
check('/auth/reset-password não encerra', !isSessionExpiry('/auth/reset-password'));
check('/auth/resend-verification não encerra', !isSessionExpiry('/auth/resend-verification'));

// --- Rotas autenticadas: 401 ali é sessão morta mesmo ------------------
check('/auth/profile encerra', isSessionExpiry('/auth/profile'));
check('/auth/avatar encerra', isSessionExpiry('/auth/avatar'));
check('/auth/account encerra', isSessionExpiry('/auth/account'));
check('/tasks encerra', isSessionExpiry('/tasks'));
check('/projects encerra', isSessionExpiry('/projects'));
check('/teams encerra', isSessionExpiry('/teams'));

// --- Fronteiras da expressão -------------------------------------------
// O \b evita que um prefixo parecido entre na lista por acidente.
check('/auth/password-policy NÃO é tratada como /auth/password', isSessionExpiry('/auth/password-policy'));
check('/auth/logout-all é rota diferente', isSessionExpiry('/auth/logout-all'));
// Query string não muda a decisão.
check('query string não atrapalha', !isSessionExpiry('/auth/password?x=1'));
// Só casa no começo do caminho.
check('/outra/auth/login encerra', isSessionExpiry('/outra/auth/login'));

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
