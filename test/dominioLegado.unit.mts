/**
 * Endereço antigo leva ao endereço certo. Rodar: npm run test
 *
 * O caso real: um aviso de "novo pedido para entrar na equipe" abriu
 * `fassaja.vercel.app/team` e caiu num 404 DEPLOYMENT_NOT_FOUND. A rota
 * `/team` existe e responde 200 em www.fassaja.com — o que estava velho era o
 * DOMÍNIO, guardado no service worker de quem instalou o app antes da
 * mudança. O clique da notificação abre na origem do worker, e aquela origem
 * não serve mais nada.
 *
 * Este arquivo também amarra a cópia: o worker é servido como está de
 * /public, não passa pelo build, e por isso repete a lista de hosts legados
 * em JavaScript puro. Duas cópias que podem divergir são duas cópias que VÃO
 * divergir — a menos que um teste compare.
 */
import { readFileSync } from 'node:fs';
import { destinoCanonico, ehHostLegado, ORIGEM_CANONICA } from '../src/utils/dominio.ts';

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

check('o domínio antigo é reconhecido', ehHostLegado('fassaja.vercel.app'));
check('maiúsculas não enganam', ehHostLegado('Fassaja.Vercel.App'));
check('o domínio de verdade não é legado', !ehHostLegado('www.fassaja.com'));
// Preview da Vercel tem de continuar funcionando: ele existe justamente para
// testar antes de publicar, e mandá-lo para produção tiraria a razão dele.
check('preview da Vercel não é redirecionado', !ehHostLegado('fassaja-git-teste.vercel.app'));
check('localhost não é redirecionado', !ehHostLegado('localhost'));

const destino = destinoCanonico({
  hostname: 'fassaja.vercel.app',
  pathname: '/team',
  search: '?tab=pedidos',
  hash: '#topo',
});
// Quem clicou em "aprovar" quer cair na equipe, não na página inicial.
check('o caminho, a busca e a âncora sobrevivem', destino === `${ORIGEM_CANONICA}/team?tab=pedidos#topo`);
check(
  'quem já está no domínio certo não é redirecionado',
  destinoCanonico({ hostname: 'www.fassaja.com', pathname: '/team' }) === null,
);

// A cópia dentro do service worker precisa dizer a mesma coisa.
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
check('o worker conhece o mesmo domínio antigo', sw.includes("'fassaja.vercel.app'"));
check('o worker aponta para a mesma origem canônica', sw.includes(`'${ORIGEM_CANONICA}'`));
check('o worker reescreve o destino quando está num host legado', /legado \? ORIGEM_CANONICA_SW \+ caminho/.test(sw));

console.log(`\n${passed} passaram, ${failed} falharam`);
process.exit(failed === 0 ? 0 : 1);
