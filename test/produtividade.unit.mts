/**
 * Testes das séries e dos números da semana.
 *
 * Tudo aqui existe por causa da faxina: tarefas concluídas somem do banco em 4
 * dias. Contar as vivas fazia o gráfico do mês zerar as primeiras semanas e a
 * barra da meta semanal ANDAR PARA TRÁS. Estes testes travam a fonte certa.
 * Rodar: npm test
 */
import {
  diaISO,
  inicioDaSemana,
  resumoSemanal,
  serieDaSemana,
  serieDoMes,
  ROTULOS_DA_SEMANA,
  type DiaDoHistorico,
} from '../src/utils/produtividade.ts';

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const hist = (linhas: [string, number, number][]) =>
  new Map<string, DiaDoHistorico>(
    linhas.map(([date, created, completed]) => [date, { date, created, completed }]),
  );

// Quarta-feira, 19 de agosto de 2026. A semana dela vai de 17 (seg) a 23 (dom).
const QUARTA = new Date(2026, 7, 19);

// --- início da semana ---
check('a semana começa na SEGUNDA', diaISO(inicioDaSemana(QUARTA)) === '2026-08-17');
check('na própria segunda, o início é ela mesma',
  diaISO(inicioDaSemana(new Date(2026, 7, 17))) === '2026-08-17');
// O domingo é o ÚLTIMO dia da semana aqui, não o primeiro — é onde uma
// contagem que começa no domingo erra a semana inteira.
check('no domingo, a semana ainda é a que começou na segunda',
  diaISO(inicioDaSemana(new Date(2026, 7, 23))) === '2026-08-17');

// --- série da semana ---
{
  const s = serieDaSemana(hist([['2026-08-17', 2, 1], ['2026-08-19', 0, 4]]), QUARTA);
  check('a série tem sete dias', s.length === 7);
  check('e começa na segunda', s[0].day === ROTULOS_DA_SEMANA[0]);
  check('segunda traz o que o histórico registrou', s[0].created === 2 && s[0].completed === 1);
  check('quarta também', s[2].completed === 4);
  check('dia sem registro vira zero, não buraco', s[1].created === 0 && s[1].completed === 0);
  check('dias futuros da semana ficam zerados', s[6].completed === 0);
}

// --- série do mês ---
{
  // Agosto tem 31 dias => 5 baldes de 7 dias (o último com 3).
  const s = serieDoMes(hist([
    ['2026-08-01', 1, 1],
    ['2026-08-07', 0, 2],  // ainda "Sem 1"
    ['2026-08-08', 0, 5],  // primeiro dia de "Sem 2"
    ['2026-08-31', 0, 9],  // "Sem 5"
  ]), QUARTA);
  check('agosto rende cinco baldes', s.length === 5);
  check('dias 1 a 7 caem na Sem 1', s[0].completed === 3);
  check('o dia 8 abre a Sem 2', s[1].completed === 5);
  check('o dia 31 cai no último balde', s[4].completed === 9);
  check('semana sem atividade fica zerada', s[2].completed === 0);
  // O ponto todo: dias antigos NÃO somem, porque não vêm da lista de tarefas.
  check('as primeiras semanas do mês não aparecem zeradas', s[0].completed > 0);
}

// --- resumo semanal ---
{
  const h = hist([
    // Semana passada: 10 a 16 de agosto.
    ['2026-08-10', 0, 3],
    ['2026-08-14', 0, 5],
    // Esta semana: 17 em diante.
    ['2026-08-17', 0, 2],
    ['2026-08-19', 0, 2],
    // Depois de hoje (quarta) — não pode entrar na conta desta semana.
    ['2026-08-21', 0, 50],
  ]);
  const r = resumoSemanal(h, QUARTA);
  check('esta semana soma de segunda até HOJE', r.estaSemana === 4);
  check('o futuro não é contado como já feito', r.estaSemana !== 54);
  check('a semana passada soma os sete dias dela', r.semanaPassada === 8);
  check('a variação compara as duas', r.variacao === -50);
}

// Sem base de comparação a variação é 0 — não "+100%".
{
  const r = resumoSemanal(hist([['2026-08-17', 0, 7]]), QUARTA);
  check('primeira semana de uso não inventa melhora', r.variacao === 0);
  check('mas o que foi feito é contado', r.estaSemana === 7);
}
{
  const r = resumoSemanal(hist([['2026-08-10', 0, 4]]), QUARTA);
  check('semana sem nada feito é -100%, e isso é verdade', r.variacao === -100);
}
{
  const r = resumoSemanal(new Map(), QUARTA);
  check('histórico vazio não quebra', r.estaSemana === 0 && r.semanaPassada === 0 && r.variacao === 0);
}

// A semana anterior atravessando a virada de mês.
{
  const h = hist([['2026-07-28', 0, 6], ['2026-08-03', 0, 3]]);
  const r = resumoSemanal(h, new Date(2026, 7, 5)); // quarta, 5 de agosto
  check('a semana passada atravessa a virada de mês', r.semanaPassada === 6);
  check('e a atual conta o que é dela', r.estaSemana === 3);
}

console.log(`\n${passed} ok, ${failed} falha(s)\n`);
if (failed > 0) process.exit(1);
