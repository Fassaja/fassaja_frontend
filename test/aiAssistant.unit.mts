/**
 * Testes da lógica pura do assistente (o Bob): rótulos de data, descrição das
 * mudanças de prazo, seleção de itens e elegibilidade de tarefas/projetos.
 * É o que decide o que aparece nos painéis antes de qualquer escrita.
 * Rodar: npm run test
 */
import {
  appliedLabel,
  bobGreeting,
  breakdownTargets,
  dayLabel,
  demoNotice,
  describeChange,
  openTaskCount,
  teamProjectOptions,
  todayLocalISO,
  toggleSelection,
} from '../src/utils/aiAssistant.ts';
import type { Task } from '../src/types/task.ts';
import type { Project } from '../src/types/project.ts';

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

const t = (over: Partial<Task>): Task =>
  ({
    id: 'x',
    title: 'Tarefa',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Task;

const p = (over: Partial<Project>): Project =>
  ({ id: 'p', name: 'Projeto', color: '#000', createdAt: '2026-08-01', ...over }) as Project;

// --- todayLocalISO / dayLabel -----------------------------------------------

check('todayLocalISO usa componentes LOCAIS (não UTC)', todayLocalISO(new Date(2026, 7, 5)) === '2026-08-05');

check('todayLocalISO preenche mês/dia com zero à esquerda', todayLocalISO(new Date(2026, 0, 9)) === '2026-01-09');

check('dayLabel identifica hoje', dayLabel('2026-08-05', '2026-08-05') === 'hoje');
check('dayLabel identifica amanhã', dayLabel('2026-08-06', '2026-08-05') === 'amanhã');
check(
  'dayLabel vira o mês corretamente ao calcular "amanhã"',
  dayLabel('2026-09-01', '2026-08-31') === 'amanhã',
);
check(
  'dayLabel usa dia da semana + data para o resto',
  // 2026-08-07 é uma sexta-feira.
  dayLabel('2026-08-07', '2026-08-05') === 'sex, 07/08',
);
check(
  'dayLabel também rotula datas passadas (sem quebrar)',
  dayLabel('2026-08-03', '2026-08-05') === 'seg, 03/08',
);

// --- describeChange ---------------------------------------------------------

const change = (over: Partial<Parameters<typeof describeChange>[0]>) => ({
  taskId: 't1',
  title: 'Tarefa',
  suggestedDueDate: '2026-08-07',
  reason: '',
  ...over,
});

check(
  'describeChange marca como atrasada a tarefa com prazo no passado',
  describeChange(change({ currentDueDate: '2026-08-01' }), '2026-08-05').wasLate === true,
);
check(
  'describeChange NÃO marca como atrasada a que vence hoje',
  describeChange(change({ currentDueDate: '2026-08-05' }), '2026-08-05').wasLate === false,
);
check(
  'describeChange descreve tarefa sem prazo como "sem prazo"',
  describeChange(change({}), '2026-08-05').from === 'sem prazo',
);
check(
  'describeChange formata o destino com o rótulo do dia',
  describeChange(change({ suggestedDueDate: '2026-08-06' }), '2026-08-05').to === 'amanhã',
);

// --- toggleSelection --------------------------------------------------------

check('toggleSelection adiciona no fim', JSON.stringify(toggleSelection(['a'], 'b')) === '["a","b"]');
check('toggleSelection remove quando já está', JSON.stringify(toggleSelection(['a', 'b'], 'a')) === '["b"]');
check('toggleSelection não muta o array original', (() => {
  const original = ['a'];
  toggleSelection(original, 'b');
  return original.length === 1;
})());

// --- demoNotice -------------------------------------------------------------

check('demoNotice fica em silêncio quando veio da IA', demoNotice({ generatedBy: 'ai' }) === null);
check(
  'demoNotice avisa que a falha NÃO custou cota',
  (demoNotice({ generatedBy: 'demo', demoReason: 'ai-error' }) ?? '').includes('não foi cobrado'),
);
check(
  'demoNotice explica o modo demonstração quando falta a chave',
  (demoNotice({ generatedBy: 'demo', demoReason: 'no-key' }) ?? '').includes('demonstração'),
);

// --- breakdownTargets -------------------------------------------------------

const tasksForBreakdown = [
  t({ id: 'concluida', status: 'completed' }),
  t({ id: 'sem-prazo-alta', priority: 'high' }),
  t({ id: 'depois', dueDate: '2026-08-10' }),
  t({ id: 'antes', dueDate: '2026-08-06' }),
  t({ id: 'sem-prazo-baixa', priority: 'low' }),
];

check(
  'breakdownTargets descarta tarefas concluídas',
  !breakdownTargets(tasksForBreakdown).some(x => x.id === 'concluida'),
);
check(
  'breakdownTargets coloca o prazo mais próximo no topo',
  breakdownTargets(tasksForBreakdown)[0].id === 'antes',
);
check(
  'breakdownTargets joga as sem prazo para o fim',
  breakdownTargets(tasksForBreakdown).slice(-2).every(x => !x.dueDate),
);
check(
  'breakdownTargets desempata as sem prazo por prioridade',
  breakdownTargets(tasksForBreakdown).slice(-2)[0].id === 'sem-prazo-alta',
);
check('breakdownTargets não muta a lista recebida', (() => {
  const copy = [...tasksForBreakdown];
  breakdownTargets(tasksForBreakdown);
  return copy[0].id === tasksForBreakdown[0].id;
})());

// --- teamProjectOptions -----------------------------------------------------

const projects = [
  p({ id: 'solo', type: 'solo' }),
  p({ id: 'time', type: 'team', teamId: 'team-1' }),
  // Projeto marcado como equipe mas sem time: não dá para atribuir ninguém.
  p({ id: 'orfao', type: 'team' }),
];

check(
  'teamProjectOptions fica só com projetos de equipe COM time',
  JSON.stringify(teamProjectOptions(projects).map(x => x.id)) === '["time"]',
);
check('teamProjectOptions devolve vazio quando não há equipe', teamProjectOptions([p({ type: 'solo' })]).length === 0);

// --- openTaskCount ----------------------------------------------------------

const mixed = [
  t({ id: '1', projectId: 'a' }),
  t({ id: '2', projectId: 'a', status: 'completed' }),
  t({ id: '3', projectId: 'b' }),
  t({ id: '4' }),
];

check('openTaskCount conta todas as abertas sem filtro', openTaskCount(mixed) === 3);
check('openTaskCount filtra por projeto', openTaskCount(mixed, 'a') === 1);
check('openTaskCount ignora concluídas', openTaskCount(mixed, 'a') === 1 && openTaskCount(mixed, 'b') === 1);

// --- appliedLabel / bobGreeting ---------------------------------------------

check('appliedLabel concorda no singular', appliedLabel(1, 'tarefa') === '1 tarefa atualizada');
check('appliedLabel concorda no plural', appliedLabel(3, 'subtarefa') === '3 subtarefas atualizadas');

check('bobGreeting sem status ainda cumprimenta', bobGreeting(null).length > 0);
check(
  'bobGreeting avisa o modo demonstração',
  bobGreeting({ aiEnabled: false, remaining: 0 }).includes('demonstração'),
);
check(
  'bobGreeting avisa quando a cota acabou',
  bobGreeting({ aiEnabled: true, remaining: 0 }).includes('acabou'),
);
check(
  'bobGreeting usa singular com 1 uso restante',
  bobGreeting({ aiEnabled: true, remaining: 1 }).includes('Resta 1 uso'),
);
check(
  'bobGreeting mostra o saldo quando há vários usos',
  bobGreeting({ aiEnabled: true, remaining: 4 }).includes('4 usos'),
);

console.log(`\n${passed} passou, ${failed} falhou.`);
if (failed > 0) process.exitCode = 1;
