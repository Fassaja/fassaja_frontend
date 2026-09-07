/**
 * Testes da higiene do endereço enviado à medição de acessos.
 *
 * Parte da suíte usa o `matchRoutes` DO PRÓPRIO react-router: o achado FE-04
 * era exatamente uma divergência entre o que o roteador considera a rota de
 * convite e o que o sanitizador considerava. Comparar com a implementação real
 * é o único jeito de a régua não voltar a divergir.
 *
 * Rodar: npm run test
 */
import { readFileSync } from 'node:fs';
import { matchRoutes } from 'react-router';
import { sanitizePath, sanitizeUrl, PADROES_CONHECIDOS, ROTA_DESCONHECIDA } from '../src/utils/analyticsPath.ts';

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
check('exclusão de conta não é enviada', sanitizePath('/excluir-conta?x=1') === null);

// Convite: o caminho vira rótulo, para não virar mil endereços distintos.
check('convite vira rótulo', sanitizePath('/join/abc123') === '/join/[token]');
check('convite com token longo idem', sanitizePath('/join/9f8e7d6c5b4a3210') === '/join/[token]');
check('dois convites contam como a mesma página', sanitizePath('/join/aaa') === sanitizePath('/join/bbb'));

// --- FE-04: variantes que o ROTEADOR aceita e a régua antiga não via ----
//
// O roteador casa `/join/:token` sem olhar caixa e sobre o segmento já
// decodificado. A régua antiga comparava o texto 'join' e deixava passar o
// token cru nestas duas formas.
const ROTAS_DO_ROTEADOR = PADROES_CONHECIDOS.map(path => ({ path }));
const TOKEN = 'FIXTURE_TOKEN_a420afff8ae107bb';
const VARIANTES = [`/Join/${TOKEN}`, `/JOIN/${TOKEN}`, `/%6aoin/${TOKEN}`, `/jo%69n/${TOKEN}`];
for (const variante of VARIANTES) {
  const casou = matchRoutes(ROTAS_DO_ROTEADOR, variante)?.some(m => m.route.path === '/join/:token');
  check(`(pré-condição) o roteador casa "${variante}" com /join/:token`, casou === true);
  check(`"${variante}" vira rótulo`, sanitizePath(variante) === '/join/[token]');
  check(`o token não sobra em "${variante}"`, !(sanitizeUrl(`https://www.fassaja.com${variante}`) ?? '').includes('a420afff'));
}

// A classificação tem de concordar com o roteador em TODA rota conhecida: se
// o roteador leva a pessoa a `/join/:token`, a telemetria tem de mascarar.
for (const padrao of PADROES_CONHECIDOS) {
  const exemplo = padrao.replace(/:[^/]+/g, 'FIXTURE');
  const casou = matchRoutes(ROTAS_DO_ROTEADOR, exemplo)?.[0]?.route.path;
  check(`roteador e sanitizador concordam em ${padrao}`, casou === padrao && sanitizePath(exemplo) !== ROTA_DESCONHECIDA);
}

// --- rotas normais passam ----------------------------------------------
check('raiz passa', sanitizePath('/') === '/');
check('tarefas passa', sanitizePath('/tasks') === '/tasks');
check('configurações passa', sanitizePath('/settings') === '/settings');
check('caixa alta numa rota comum normaliza', sanitizePath('/Tasks') === '/tasks');
check('equipe vira rótulo', sanitizePath('/team/abc123/pessoas') === '/team/[id]/[aba]');

// --- a query é sempre descartada ---------------------------------------
check('query some das rotas normais', sanitizePath('/tasks?project=p1') === '/tasks');
check('fragmento some', sanitizePath('/tasks#topo') === '/tasks');
check('query e fragmento juntos', sanitizePath('/tasks?a=1#b') === '/tasks');

// --- o que não é rota conhecida vira rótulo genérico --------------------
// Um endereço que ninguém previu é justamente o que pode carregar credencial.
check('vazio => null', sanitizePath('') === null);
check('rota inexistente vira rótulo', sanitizePath('/nao-existe/segredo') === ROTA_DESCONHECIDA);
check('/join sozinho não é rota conhecida', sanitizePath('/join') === ROTA_DESCONHECIDA);
check('/resetar não é /reset-password', sanitizePath('/resetar') === ROTA_DESCONHECIDA);
check('percent inválido não lança', sanitizePath('/%zz/x') === ROTA_DESCONHECIDA);
check('caminho fundo não vaza segmento', !(sanitizePath('/x/SEGREDO/y') ?? '').includes('SEGREDO'));

// --- URLs absolutas -----------------------------------------------------
check('URL absoluta é aceita', sanitizePath('https://www.fassaja.com/tasks') === '/tasks');
check('URL absoluta de convite também mascara', sanitizePath('https://www.fassaja.com/join/xyz') === '/join/[token]');
check('URL absoluta de reset também é descartada', sanitizePath('https://www.fassaja.com/reset-password?token=x') === null);

// --- sanitizeUrl: o que de fato vai para a medição ---------------------
check('mantém a origem', sanitizeUrl('https://www.fassaja.com/tasks') === 'https://www.fassaja.com/tasks');
check('raiz continua absoluta', sanitizeUrl('https://www.fassaja.com/') === 'https://www.fassaja.com/');
check('convite: origem + rótulo', sanitizeUrl('https://www.fassaja.com/join/a420afff8ae107bb') === 'https://www.fassaja.com/join/[token]');
check('o token real não sobra na URL', !(sanitizeUrl('https://www.fassaja.com/join/a420afff8ae107bb') ?? '').includes('a420afff'));
check('reset continua descartado', sanitizeUrl('https://www.fassaja.com/reset-password?token=x') === null);
check('query some, origem fica', sanitizeUrl('https://www.fassaja.com/tasks?project=p1') === 'https://www.fassaja.com/tasks');
check('porta e host locais preservados', sanitizeUrl('http://localhost:5173/tasks') === 'http://localhost:5173/tasks');
check('entrada relativa devolve o caminho', sanitizeUrl('/tasks') === '/tasks');

// --- a lista não pode ficar para trás do AppRoutes ----------------------
// Uma rota criada amanhã sem passar por aqui cairia em "desconhecida" — o que
// é seguro, mas silencioso. O teste torna a omissão visível.
const appRoutes = readFileSync(new URL('../src/routes/AppRoutes.tsx', import.meta.url), 'utf8');
const declaradas = [...appRoutes.matchAll(/<Route\s+path="([^"]+)"/g)]
  .map(m => m[1])
  .filter(p => p !== '*');
const faltando = declaradas.filter(p => !PADROES_CONHECIDOS.includes(p));
check(`toda rota do AppRoutes está classificada (faltando: ${faltando.join(', ') || 'nenhuma'})`, faltando.length === 0);
check('a lista não inventa rota que não existe no AppRoutes', PADROES_CONHECIDOS.every(p => declaradas.includes(p)));

console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) process.exit(1);
