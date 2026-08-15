/**
 * Testes unitários dos helpers de data (sem navegador, sem dependências).
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import {
  formatDate,
  formatDateChip,
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

// formatDateChip: o rótulo curto dos chips de data nos modais de criação.
// `hoje` é fixo de propósito — teste que lê o relógio muda de resultado
// sozinho na virada do ano e vira falha misteriosa numa sexta-feira.
const HOJE = new Date(2026, 7, 15); // 15 de agosto de 2026

check('chip: hoje vira "Hoje"', formatDateChip('2026-08-15', HOJE) === 'Hoje');
check('chip: amanhã vira "Amanhã"', formatDateChip('2026-08-16', HOJE) === 'Amanhã');
check('chip: ontem vira "Ontem"', formatDateChip('2026-08-14', HOJE) === 'Ontem');

// O motivo do helper existir: o pt-BR nativo devolveria "20 de ago." e
// "10 de jan. de 2027", que num chip ao lado de outros controles quebram a linha.
check('chip: data próxima é curta, sem "de"', formatDateChip('2026-08-20', HOJE) === '20 ago');
check('chip: mês do ano corrente omite o ano', formatDateChip('2026-12-01', HOJE) === '1 dez');
check('chip: outro ano mostra o ano', formatDateChip('2027-01-10', HOJE) === '10 jan 2027');
check('chip: ano passado também', formatDateChip('2025-11-03', HOJE) === '3 nov 2025');
check('chip: valor vazio não quebra', formatDateChip('', HOJE) === '');

// A comparação é por DIA local, não por instante: a hora do "hoje" recebido
// não pode mudar a resposta, senão o rótulo trocaria sozinho às 21h.
check(
  'chip: hora do dia não muda o resultado',
  formatDateChip('2026-08-16', new Date(2026, 7, 15, 23, 59)) === 'Amanhã',
);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
