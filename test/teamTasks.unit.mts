/**
 * Testes da ordenação das tarefas da equipe (painel). Pendentes primeiro (por
 * prazo crescente, sem prazo ao fim), concluídas por último, sem mutar a entrada.
 * Rodar: npm run test
 */
import { sortTeamTasks } from '../src/utils/teamTasks.ts';
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

const t = (over: Partial<Task>): Task =>
  ({
    id: 'x',
    title: 'x',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }) as Task;

const tasks = [
  t({ id: 'done', status: 'completed', dueDate: '2026-01-01' }),
  t({ id: 'late', status: 'pending', dueDate: '2026-01-05' }),
  t({ id: 'soon', status: 'pending', dueDate: '2026-01-02' }),
  t({ id: 'nodate', status: 'pending' }),
];
const order = sortTeamTasks(tasks).map(x => x.id);

check('pendente com prazo mais próximo vem primeiro', order[0] === 'soon');
check('pendente com prazo posterior vem em seguida', order[1] === 'late');
check('pendente sem prazo vem depois das com prazo', order[2] === 'nodate');
check('concluída vai para o fim', order[3] === 'done');
check('não muta o array original', tasks[0].id === 'done');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
