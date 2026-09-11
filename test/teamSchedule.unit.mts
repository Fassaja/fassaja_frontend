/**
 * Testes da projeção do cronograma da equipe: a janela, o marco, a barra
 * aberta, o bloqueio pela mãe, o teto de colunas e a ordem dos grupos.
 * Rodar: npm run test
 */
import {
  buildTeamSchedule,
  diferencaDias,
  marcasDe,
  MAX_DIAS,
  rotuloDaLinha,
  segundasDe,
  semanasDe,
  somarDias,
} from '../src/utils/teamSchedule.ts';
import type { Task } from '../src/types/task.ts';

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

let seq = 0;
const t = (over: Partial<Task>): Task => ({
  id: `t${++seq}`,
  title: `Tarefa ${seq}`,
  status: 'pending',
  priority: 'medium',
  createdAt: '2026-09-01T00:00:00.000Z',
  teamId: 'equipe',
  ...over,
});

const HOJE = '2026-09-11'; // sexta
const projetos = [
  { id: 'p1', name: 'Obra', color: '#2477FF' },
  { id: 'p2', name: 'Site', color: '#22C55E' },
];

// --- helpers de data ---------------------------------------------------------
check('somarDias vira o mês e o ano', somarDias('2026-09-30', 1) === '2026-10-01' && somarDias('2026-12-31', 1) === '2027-01-01');
check('somarDias volta', somarDias('2026-10-01', -1) === '2026-09-30');
check('diferencaDias conta dias de calendário', diferencaDias('2026-09-01', '2026-09-11') === 10 && diferencaDias('2026-09-11', '2026-09-01') === -10);

// --- janela ------------------------------------------------------------------
{
  const s = buildTeamSchedule([], projetos, HOJE);
  check('sem tarefa, a janela é hoje −7 … hoje +21', s.days[0] === '2026-09-04' && s.days[s.days.length - 1] === '2026-10-02');
  check('hoje está na coluna 7', s.todayCol === 7 && s.days[7] === HOJE);
  check('sem tarefa não há grupo', s.groups.length === 0 && s.semData === 0);
}

{
  const s = buildTeamSchedule(
    [t({ projectId: 'p1', startDate: '2026-08-20', dueDate: '2026-10-20' })],
    projetos,
    HOJE,
  );
  check('a janela abre até o menor início e o maior prazo', s.days[0] === '2026-08-20' && s.days[s.days.length - 1] === '2026-10-20');
}

// --- marco, barra aberta, barra normal --------------------------------------
{
  const s = buildTeamSchedule(
    [
      t({ projectId: 'p1', dueDate: '2026-09-15' }),
      t({ projectId: 'p1', startDate: '2026-09-09' }),
      t({ projectId: 'p1', startDate: '2026-09-14', dueDate: '2026-09-16' }),
      t({ projectId: 'p1', startDate: '2026-09-20' }),
    ],
    projetos,
    HOJE,
  );
  const [aberta, normal, marco, futura] = s.groups[0].rows;
  check('só com prazo vira marco na coluna do prazo', marco.marco && marco.col.start === marco.col.end && s.days[marco.col.start] === '2026-09-15');
  check('só com início vira barra aberta até hoje', aberta.abertoNoFim && !aberta.marco && aberta.end === HOJE && s.days[aberta.col.end] === HOJE);
  check('início no futuro e sem prazo: barra de um dia, aberta', futura.abertoNoFim && futura.start === '2026-09-20' && futura.end === '2026-09-20');
  check('início e prazo viram barra do início ao prazo', !normal.marco && !normal.abertoNoFim && s.days[normal.col.start] === '2026-09-14' && s.days[normal.col.end] === '2026-09-16');
  check('dentro do grupo, a ordem é por início', s.groups[0].rows.map(r => r.start).join() === '2026-09-09,2026-09-14,2026-09-15,2026-09-20');
}

// --- bloqueio ----------------------------------------------------------------
{
  const mae = t({ projectId: 'p1', dueDate: '2026-09-12' });
  const maeFechada = t({ projectId: 'p1', dueDate: '2026-09-10', status: 'completed', teamCompleted: true });
  const maeEntregueSoPorMim = t({ projectId: 'p1', dueDate: '2026-09-10', status: 'completed', teamCompleted: false });
  const s = buildTeamSchedule(
    [
      mae,
      maeFechada,
      maeEntregueSoPorMim,
      t({ projectId: 'p1', dueDate: '2026-09-14', dependsOnId: mae.id }),
      t({ projectId: 'p1', dueDate: '2026-09-14', dependsOnId: maeFechada.id }),
      t({ projectId: 'p1', dueDate: '2026-09-14', dependsOnId: maeEntregueSoPorMim.id }),
      t({ projectId: 'p1', dueDate: '2026-09-14', dependsOnId: 'apagada' }),
    ],
    projetos,
    HOJE,
  );
  const por = (id: string | undefined) => s.groups[0].rows.find(r => r.task.dependsOnId === id)!;
  check('mãe aberta bloqueia', por(mae.id).bloqueadaPor?.id === mae.id);
  check('mãe fechada para a equipe não bloqueia', por(maeFechada.id).bloqueadaPor === null);
  check('mãe que só EU entreguei ainda bloqueia (teamCompleted manda)', por(maeEntregueSoPorMim.id).bloqueadaPor?.id === maeEntregueSoPorMim.id);
  check('mãe fora da lista (apagada) não bloqueia', por('apagada').bloqueadaPor === null);
}

// --- teto --------------------------------------------------------------------
{
  const s = buildTeamSchedule(
    [
      t({ projectId: 'p1', startDate: '2026-09-01', dueDate: '2027-06-01' }),
      t({ projectId: 'p1', dueDate: '2027-05-01' }),
    ],
    projetos,
    HOJE,
  );
  const [longa, longe] = s.groups[0].rows;
  check(`a janela respeita o teto de ${MAX_DIAS} dias`, s.days.length === MAX_DIAS);
  check('a barra que passa do teto é cortada na última coluna', longa.cortada && longa.col.end === MAX_DIAS - 1 && longa.col.start === 0);
  check('o marco além do teto cai na última coluna, cortado', longe.cortada && longe.col.start === MAX_DIAS - 1);
}

// --- grupos ------------------------------------------------------------------
{
  const s = buildTeamSchedule(
    [
      t({ dueDate: '2026-09-12' }), // solta
      t({ projectId: 'p2', dueDate: '2026-09-12' }),
      t({ projectId: 'p1', dueDate: '2026-09-12' }),
      t({ projectId: 'desconhecido', dueDate: '2026-09-12' }),
      t({ projectId: 'p1' }), // sem data
      t({ projectId: 'p1', title: '', dueDate: '' }), // sem data (vazio)
    ],
    projetos,
    HOJE,
  );
  check('grupos seguem a ordem dos projetos', s.groups[0].project?.id === 'p1' && s.groups[1].project?.id === 'p2');
  check('"Sem projeto" fica por último e junta as de projeto desconhecido', s.groups[2].project === null && s.groups[2].rows.length === 2);
  check('as sem data ficam de fora e são contadas', s.semData === 2 && s.groups.flatMap(g => g.rows).length === 4);
}

// --- semanas -----------------------------------------------------------------
{
  // sex 4/9 … sex 2/10: pedaço de semana, três inteiras, pedaço.
  const s = buildTeamSchedule([], projetos, HOJE);
  const w = s.weeks;
  check('as semanas cobrem todas as colunas', w.reduce((n, x) => n + x.span, 0) === s.days.length);
  check('a primeira semana é cortada na janela (sex–dom = 3 dias)', w[0].span === 3 && w[0].label === '4 – 6 set');
  check('semana inteira começa na segunda', w[1].span === 7 && w[1].label === '7 – 13 set');
  check('semana que cruza o mês diz os dois meses (e a última é cortada na janela)', w[4].label === '28 set – 2 out' && w[4].span === 5);
  check('semanasDe de um dia só', semanasDe(['2026-09-11'])[0].label === '11 set');
}

// --- o compacto: rótulos e marcas ------------------------------------------
{
  const s = buildTeamSchedule([], projetos, HOJE);
  const m = marcasDe(s.days, s.weeks);
  check('marcas: só as segundas, sem a semana cortada do início', m.length === 4 && m[0].col === 3 && m[0].label === '7 set' && m[3].label === '28 set');
  check('segundas: uma por semana inteira', segundasDe(s.weeks).join() === '3,10,17,24');
  const longo = buildTeamSchedule([t({ projectId: 'p1', startDate: '2026-09-01', dueDate: '2027-06-01' })], projetos, HOJE);
  const ml = marcasDe(longo.days, longo.weeks);
  check('marcas: com 120 dias, pula semanas para caber em 5', ml.length <= 5 && ml.length >= 3);
  check('rótulo da linha: barra', rotuloDaLinha({ start: '2026-09-08', end: '2026-09-12', marco: false, abertoNoFim: false }) === '8 – 12 set');
  check('rótulo da linha: marco é só o dia', rotuloDaLinha({ start: '2026-09-20', end: '2026-09-20', marco: true, abertoNoFim: false }) === '20 set');
  check('rótulo da linha: aberta diz desde quando', rotuloDaLinha({ start: '2026-09-09', end: HOJE, marco: false, abertoNoFim: true }) === 'desde 9 set');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
