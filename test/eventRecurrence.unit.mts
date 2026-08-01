/**
 * Testes unitários da recorrência semanal da Agenda (sem navegador).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import {
  expandWeekdayDates,
  MAX_RECURRENCE_DATES,
  REPEAT_OPTIONS,
  DEFAULT_REPEAT_VALUE,
} from '../src/utils/eventRecurrence.ts';

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

// 2026-06-26 é uma sexta-feira (getDay() === 5).
check(
  'sem dias selecionados => apenas a própria data',
  JSON.stringify(expandWeekdayDates('2026-06-26', [], 4)) === JSON.stringify(['2026-06-26']),
);

// Segundas (1) e quartas (3) por 1 semana, a partir de sexta 26/06.
// Próximas ocorrências dentro de [26/06, 03/07]: seg 29/06, qua 01/07.
const monWed = expandWeekdayDates('2026-06-26', [1, 3], 1);
check('seg+qua: gera as datas certas', JSON.stringify(monWed) === JSON.stringify(['2026-06-29', '2026-07-01']));

// Inclui a própria data quando o dia dela está selecionado (sexta = 5).
const withFriday = expandWeekdayDates('2026-06-26', [5], 1);
check('inclui a data inicial quando o dia dela é selecionado', withFriday[0] === '2026-06-26');

// Todas as datas geradas caem nos dias da semana pedidos.
const everyTueThu = expandWeekdayDates('2026-06-26', [2, 4], 8);
check(
  'todas as datas batem com terça/quinta',
  everyTueThu.every(d => {
    const [y, m, day] = d.split('-').map(Number);
    const wd = new Date(y, m - 1, day).getDay();
    return wd === 2 || wd === 4;
  }),
);

// Trava de segurança: nunca passa do teto, mesmo com horizonte longo.
const capped = expandWeekdayDates('2026-06-26', [0, 1, 2, 3, 4, 5, 6], 200);
check('respeita o teto de segurança', capped.length <= MAX_RECURRENCE_DATES);

// Data inválida cai no caso seguro (apenas a entrada).
check(
  'data inválida => apenas a entrada',
  JSON.stringify(expandWeekdayDates('', [1, 3], 4)) === JSON.stringify(['']),
);

// Opções de duração: das mais curtas (semanas) até 1 ano, e o padrão é a menor.
check(
  'opções de repetição na ordem esperada',
  JSON.stringify(REPEAT_OPTIONS.map(o => o.weeks)) === JSON.stringify([1, 2, 3, 4, 12, 26, 52]),
);
check(
  'value bate com weeks em toda opção',
  REPEAT_OPTIONS.every(o => o.value === String(o.weeks)),
);
check('padrão é o horizonte mais curto', DEFAULT_REPEAT_VALUE === '1');

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
