/**
 * Testes da higiene do endereço enviado à medição de acessos.
 * Rodar: npm run test
 */
import { sanitizePath } from '../src/utils/analyticsPath.ts';

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

// --- o que motivou o arquivo -------------------------------------------
// Token de redefinição: vale 1h e dá acesso total à conta. Não sai daqui.
check('reset-password com token não é enviado', sanitizePath('/reset-password?token=abc123') === null);
check('reset-password sem token também não', sanitizePath('/reset-password') === null);
check('reset-password com barra no fim também não', sanitizePath('/reset-password/') === null);

// Convite: o caminho vira rótulo, para não virar mil endereços distintos.
check('convite vira rótulo', sanitizePath('/join/abc123') === '/join/[token]');
check('convite com token longo idem', sanitizePath('/join/9f8e7d6c5b4a3210') === '/join/[token]');
check('dois convites contam como a mesma página', sanitizePath('/join/aaa') === sanitizePath('/join/bbb'));

// --- rotas normais passam ----------------------------------------------
check('raiz passa', sanitizePath('/') === '/');
check('tarefas passa', sanitizePath('/tasks') === '/tasks');
check('configurações passa', sanitizePath('/settings') === '/settings');

// --- a query é sempre descartada ---------------------------------------
// Nada do que colocamos em query precisa ser medido, e é onde o segredo mora.
check('query some das rotas normais', sanitizePath('/tasks?project=p1') === '/tasks');
check('fragmento some', sanitizePath('/tasks#topo') === '/tasks');
check('query e fragmento juntos', sanitizePath('/tasks?a=1#b') === '/tasks');

// --- entradas estranhas não quebram ------------------------------------
check('vazio => null', sanitizePath('') === null);
check('URL absoluta é aceita', sanitizePath('https://www.fassaja.com/tasks') === '/tasks');
check('URL absoluta de convite também mascara', sanitizePath('https://www.fassaja.com/join/xyz') === '/join/[token]');
check('URL absoluta de reset também é descartada', sanitizePath('https://www.fassaja.com/reset-password?token=x') === null);

// Rota que só COMEÇA parecida não pode ser confundida com a protegida.
check('/join sozinho não carrega segredo, passa como está', sanitizePath('/join') === '/join');
check('/resetar não é /reset-password', sanitizePath('/resetar') === '/resetar');

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
