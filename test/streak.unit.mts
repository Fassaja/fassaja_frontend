/**
 * Testes unitários da sequência produtiva com dias de folga.
 * Usa o type-stripping nativo do Node (>= 22). Rodar: npm run test
 */
import { computeStreak } from '../src/utils/streak.ts';

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

// ISO (YYYY-MM-DD) no fuso LOCAL, relativo a hoje.
const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Dia da semana (0-6) do offset relativo a hoje.
const weekdayOf = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.getDay();
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// Comportamento clássico (todos os dias contam)
check('sem dias produtivos => 0', computeStreak([]) === 0);
check('só hoje => 1', computeStreak([iso(0)]) === 1);
check('hoje + ontem => 2', computeStreak([iso(0), iso(-1)]) === 2);
check('buraco ontem quebra => 1', computeStreak([iso(0), iso(-2)]) === 1);
check('só ontem (hoje ainda não acabou) => 1', computeStreak([iso(-1)]) === 1);
check('explícito todos os dias == padrão', computeStreak([iso(0), iso(-1)], ALL_DAYS) === 2);

// Folga não quebra a sequência: ativo hoje e anteontem; ontem é folga.
{
  const restYesterday = ALL_DAYS.filter(d => d !== weekdayOf(-1));
  check(
    'folga ontem não quebra (hoje + anteontem) => 2',
    computeStreak([iso(0), iso(-2)], restYesterday) === 2,
  );
}

// Dia de trabalho vazio quebra mesmo com folgas configuradas.
{
  const restDayBefore = ALL_DAYS.filter(d => d !== weekdayOf(-2));
  check(
    'buraco em dia de trabalho quebra => 1',
    computeStreak([iso(0), iso(-3)], restDayBefore) === 1,
  );
}

// Conclusão em dia de folga conta a favor.
{
  const restYesterday = ALL_DAYS.filter(d => d !== weekdayOf(-1));
  check(
    'conclusão na folga conta => 2',
    computeStreak([iso(0), iso(-1)], restYesterday) === 2,
  );
}

// "Fim de semana" longo: dois dias seguidos de folga entre atividades.
{
  const rest2 = ALL_DAYS.filter(d => d !== weekdayOf(-1) && d !== weekdayOf(-2));
  check(
    'duas folgas seguidas não quebram => 2',
    computeStreak([iso(0), iso(-3)], rest2) === 2,
  );
}

// Não entra em laço infinito quando só há folgas configuradas.
check(
  'apenas folgas com atividade antiga termina',
  computeStreak([iso(-30)], [weekdayOf(0)]) >= 0,
);

console.log(`\n${passed} ok, ${failed} falha(s)`);
if (failed > 0) process.exit(1);
