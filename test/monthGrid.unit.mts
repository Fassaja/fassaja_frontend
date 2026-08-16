/**
 * Testes da matemática da grade mensal (Calendário e Agenda).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import { addDays, monthWeeks, sameMonth, shiftMonth } from '../src/utils/monthGrid.ts';

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

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

console.log('\nmonthWeeks');

// Agosto/2026 começa num sábado: a grade abre com 6 dias de julho.
const ago = monthWeeks(new Date(2026, 7, 1));
check('sempre 6 semanas', ago.length === 6);
check('sempre 7 colunas', ago.every(w => w.length === 7));
check('a primeira coluna é domingo', ago.every(w => w[0].getDay() === 0));
check('começa no domingo anterior ao dia 1', iso(ago[0][0]) === '2026-07-26');
check('o dia 1 cai no sábado da primeira linha', iso(ago[0][6]) === '2026-08-01');
check('o último dia do mês está na grade', ago.flat().some(d => iso(d) === '2026-08-31'));
check('a grade transborda para o mês seguinte', iso(ago[5][6]) === '2026-09-05');

// Fevereiro/2026 começa num domingo e tem 28 dias: cabe em 4 linhas, mas a
// grade continua com 6 — é o que impede o cartão de mudar de altura.
const fev = monthWeeks(new Date(2026, 1, 15));
check('qualquer dia do mês serve de entrada', iso(fev[0][0]) === '2026-02-01');
check('mês curto também rende 6 semanas', fev.length === 6);
check('as sobras seguem contíguas', iso(fev[5][6]) === '2026-03-14');

// Sem buracos nem repetições: 42 dias consecutivos.
const dias = ago.flat();
check(
  'os 42 dias são consecutivos',
  dias.every((d, i) => i === 0 || iso(d) === iso(addDays(dias[i - 1], 1))),
);

console.log('\nshiftMonth');

check('mês seguinte, mesmo dia', iso(shiftMonth(new Date(2026, 0, 15), 1)) === '2026-02-15');
check('mês anterior, mesmo dia', iso(shiftMonth(new Date(2026, 0, 15), -1)) === '2025-12-15');
// O motivo de a função existir: 'new Date(2026, 1, 31)' normalizaria para 03/03.
check('31/03 → fevereiro gruda no dia 28', iso(shiftMonth(new Date(2026, 2, 31), -1)) === '2026-02-28');
check('31/01 → fevereiro bissexto gruda no 29', iso(shiftMonth(new Date(2024, 0, 31), 1)) === '2024-02-29');
check('31/05 → abril gruda no dia 30', iso(shiftMonth(new Date(2026, 4, 31), -1)) === '2026-04-30');
check('vira o ano para trás', iso(shiftMonth(new Date(2026, 0, 5), -1)) === '2025-12-05');
check('vira o ano para frente', iso(shiftMonth(new Date(2026, 11, 5), 1)) === '2027-01-05');

console.log('\nsameMonth');

check('mesmo mês e ano', sameMonth(new Date(2026, 7, 1), new Date(2026, 7, 31)));
check('mesmo mês, ano diferente, não', !sameMonth(new Date(2025, 7, 1), new Date(2026, 7, 1)));
check('dias vizinhos de outro mês, não', !sameMonth(new Date(2026, 6, 31), new Date(2026, 7, 1)));

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
