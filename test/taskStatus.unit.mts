/**
 * Testes da derivação de status "atrasada". Regressão do bug em que uma tarefa
 * vencida movida para "Em andamento" voltava sozinha para Pendente: só tarefas
 * PENDENTES vencidas viram overdue; em andamento e concluída mantêm o status.
 * Rodar: npm run test
 */
import { deriveTaskStatus } from '../src/utils/taskStatus.ts';
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

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const t = (over: Partial<Task>): Task =>
  ({
    id: 'x',
    title: 'x',
    status: 'pending',
    priority: 'low',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as Task;

check(
  'pendente vencida vira overdue',
  deriveTaskStatus(t({ status: 'pending', dueDate: iso(-1) })).status === 'overdue',
);
check(
  'em andamento vencida NÃO vira overdue (o bug)',
  deriveTaskStatus(t({ status: 'in_progress', dueDate: iso(-1) })).status === 'in_progress',
);
check(
  'concluída vencida continua completed',
  deriveTaskStatus(t({ status: 'completed', dueDate: iso(-1) })).status === 'completed',
);
check(
  'pendente que vence hoje não é overdue',
  deriveTaskStatus(t({ status: 'pending', dueDate: iso(0) })).status === 'pending',
);
check(
  'pendente futura continua pending',
  deriveTaskStatus(t({ status: 'pending', dueDate: iso(3) })).status === 'pending',
);
check('sem prazo continua pending', deriveTaskStatus(t({ status: 'pending' })).status === 'pending');

const orig = t({ status: 'pending', dueDate: iso(-1) });
deriveTaskStatus(orig);
check('não muta a tarefa original', orig.status === 'pending');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
