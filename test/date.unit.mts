/**
 * Testes unitários dos helpers de data (sem navegador, sem dependências).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import {
  formatDate,
  isToday,
  isTomorrow,
  isOverdue,
  isThisWeek,
  getDayOfWeek,
} from '../src/utils/date.ts';

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

// Datas relativas a "agora", em ISO (YYYY-MM-DD) no fuso LOCAL — para casar
// com o parseDate do util (que lê 'YYYY-MM-DD' como dia local). Usar
// toISOString() aqui introduziria um descasamento UTC×local sem relação com o
// que se testa.
const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// isToday / isTomorrow
check('isToday(hoje) => true', isToday(iso(0)));
check('isToday(ontem) => false', !isToday(iso(-1)));
check('isTomorrow(amanhã) => true', isTomorrow(iso(1)));
check('isTomorrow(hoje) => false', !isTomorrow(iso(0)));

// isOverdue: estritamente antes de hoje (00:00).
check('isOverdue(ontem) => true', isOverdue(iso(-1)));
check('isOverdue(hoje) => false (hoje não está atrasado)', !isOverdue(iso(0)));
check('isOverdue(amanhã) => false', !isOverdue(iso(1)));

// isThisWeek: dentro da semana corrente (domingo a sábado).
check('isThisWeek(hoje) => true', isThisWeek(iso(0)));
check('isThisWeek(+30 dias) => false', !isThisWeek(iso(30)));

// getDayOfWeek bate com o getDay() nativo.
const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
check(
  'getDayOfWeek casa com o dia da semana local de hoje',
  getDayOfWeek(iso(0)) === dias[new Date().getDay()],
);

// formatDate: ano atual omite o ano; ano diferente inclui o ano.
const thisYear = new Date().getFullYear();
check(
  'formatDate do ano atual não inclui o ano',
  !formatDate(`${thisYear}-03-15`).includes(String(thisYear)),
);
check(
  'formatDate de outro ano inclui o ano',
  formatDate(`${thisYear - 2}-03-15`).includes(String(thisYear - 2)),
);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
