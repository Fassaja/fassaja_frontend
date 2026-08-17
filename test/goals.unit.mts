/**
 * Testes das regras de meta (sem navegador, sem dependências).
 * Rodar: npm run test
 *
 * A regra de semeadura é o que merece teste de verdade: ela roda UMA vez por
 * conta, na primeira carga após o deploy, e se estiver errada sobrescreve a
 * meta real de alguém por um padrão. Não dá para "testar em produção" um
 * caminho que só acontece uma vez.
 */
import {
  GOAL_DEFAULTS,
  GOAL_LIMITS,
  clampGoal,
  clampGoals,
  isCustomized,
  shouldSeed,
} from '../src/utils/goals.ts';

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

// --- os números precisam bater com o backend ----------------------------
check('padrão diário = 5 (default da coluna)', GOAL_DEFAULTS.daily === 5);
check('padrão semanal = 25 (default da coluna)', GOAL_DEFAULTS.weekly === 25);
check('teto diário = 99 (UpdateGoalsDto)', GOAL_LIMITS.daily.max === 99);
check('teto semanal = 999 (UpdateGoalsDto)', GOAL_LIMITS.weekly.max === 999);
check('mínimo = 1 nas duas', GOAL_LIMITS.daily.min === 1 && GOAL_LIMITS.weekly.min === 1);

// --- clamp: nada sai daqui que a API vá recusar --------------------------
check('valor normal passa', clampGoal('8', 'daily') === 8);
check('zero vira 1 (a API recusa 0)', clampGoal('0', 'daily') === 1);
check('negativo vira 1', clampGoal(-5, 'daily') === 1);
check('acima do teto diário é aparado em 99', clampGoal('500', 'daily') === 99);
check('o mesmo 500 passa na semanal', clampGoal('500', 'weekly') === 500);
check('acima do teto semanal é aparado em 999', clampGoal(5000, 'weekly') === 999);
check('quebrado é truncado', clampGoal(2.7, 'daily') === 2);
// Campo de texto vazio: NaN escapando daqui viraria null no JSON e 400 na API.
check('vazio cai no padrão', clampGoal('', 'daily') === 5);
check('lixo cai no padrão', clampGoal('abc', 'weekly') === 25);
check('clampGoals aplica a faixa certa em cada um',
  JSON.stringify(clampGoals({ daily: 500, weekly: 5000 })) === JSON.stringify({ daily: 99, weekly: 999 }));

// --- customizado ---------------------------------------------------------
check('o padrão não é customizado', !isCustomized({ daily: 5, weekly: 25 }));
check('mexer só na diária já é customizado', isCustomized({ daily: 8, weekly: 25 }));
check('mexer só na semanal também', isCustomized({ daily: 5, weekly: 40 }));

// --- semeadura: o caminho que roda uma vez e não tem segunda chance ------
const PADRAO = { daily: 5, weekly: 25 };

check(
  'meta local escolhida + servidor no padrão => semeia (o caso que motivou tudo)',
  shouldSeed({ daily: 8, weekly: 40 }, PADRAO),
);
check(
  'local no padrão => nada a recuperar, não semeia',
  !shouldSeed(PADRAO, PADRAO),
);
// O caso que estragaria tudo: aparelho novo, localStorage limpo (padrão), e o
// servidor já com a meta real. Semear aqui apagaria a meta da pessoa com 5/25.
check(
  'aparelho novo NÃO sobrescreve a meta que já está no servidor',
  !shouldSeed(PADRAO, { daily: 8, weekly: 40 }),
);
check(
  'servidor já customizado => alguém já semeou, não mexe',
  !shouldSeed({ daily: 3, weekly: 12 }, { daily: 8, weekly: 40 }),
);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
