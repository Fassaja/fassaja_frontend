/**
 * Testes da agregação do relatório de equipe. Cobre os totais, a carga por
 * membro, o progresso por projeto, a ordenação (quem está mais sobrecarregado
 * e o projeto mais travado primeiro) e a derivação de "atrasada" no fuso local.
 * Rodar: npm run test
 */
import { buildTeamReport } from '../src/utils/teamReport.ts';
import type { Task } from '../src/types/task.ts';
import type { TeamMember } from '../src/types/team.ts';

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

// Data local 'YYYY-MM-DD' deslocada em dias — mesma regra do deriveTaskStatus.
const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

let seq = 0;
/**
 * `dono` continua sendo escrito como um id só nos casos abaixo — é o que os
 * testes medem (carga por pessoa). O helper traduz para a lista de
 * responsáveis do modelo novo, onde uma tarefa pode ter vários.
 */
const t = (over: Partial<Task> & { dono?: string }): Task =>
  ({
    id: `t${++seq}`,
    title: 'Tarefa',
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    tags: [],
    ...over,
    assignees: over.dono
      ? [{ id: over.dono, name: over.dono, done: over.status === 'completed' }]
      : [],
  }) as Task;

const member = (userId: string, name: string): TeamMember =>
  ({
    userId,
    name,
    email: `${userId}@x.com`,
    role: 'member',
    title: null,
    avatar: null,
    canManageTasks: false,
  }) as TeamMember;

const ana = member('u1', 'Ana');
const bruno = member('u2', 'Bruno');
const projA = { id: 'p1', name: 'Projeto A', color: '#111111' };
const projB = { id: 'p2', name: 'Projeto B', color: '#222222' };

// ---------- Totais ----------
{
  const tasks = [
    t({ projectId: 'p1', dono: 'u1', status: 'completed' }),
    t({ projectId: 'p1', dono: 'u1' }),
    t({ projectId: 'p1', dono: 'u2', dueDate: iso(-3) }), // atrasada
    t({ projectId: 'p1' }), // sem responsável
  ];
  const r = buildTeamReport(tasks, [ana, bruno], [projA]);

  check('total conta todas as tarefas', r.total === 4);
  check('completed conta as concluídas', r.completed === 1);
  check('open = total - concluídas', r.open === 3);
  check('overdue deriva pendente vencida', r.overdue === 1);
  check('unassigned conta tarefas sem responsável', r.unassigned === 1);
  check('completionRate arredonda (1/4 => 25)', r.completionRate === 25);
}

// ---------- "Atrasada" segue a regra do app ----------
{
  const tasks = [
    t({ dono: 'u1', status: 'in_progress', dueDate: iso(-5) }), // NÃO é atrasada
    t({ dono: 'u1', status: 'completed', dueDate: iso(-5) }), // NÃO é atrasada
    t({ dono: 'u1', dueDate: iso(0) }), // vence hoje: NÃO é atrasada
    t({ dono: 'u1', dueDate: iso(-1) }), // atrasada
  ];
  const r = buildTeamReport(tasks, [ana], []);

  // As três tarefas vencidas do cenário são: em andamento, concluída e a que
  // vence hoje — nenhuma conta. Só a pendente de ontem é atrasada.
  check('só a pendente vencida conta como atrasada (em andamento, concluída e "hoje" não)', r.overdue === 1);
}

// ---------- Carga por membro ----------
{
  const tasks = [
    t({ dono: 'u1', status: 'completed' }),
    t({ dono: 'u1', status: 'completed' }),
    t({ dono: 'u1' }),
    t({ dono: 'u2' }),
    t({ dono: 'u2' }),
    t({ dono: 'u2', dueDate: iso(-2) }),
    t({}), // sem responsável: não entra na carga de ninguém
  ];
  const r = buildTeamReport(tasks, [ana, bruno], []);
  const a = r.members.find(m => m.userId === 'u1')!;
  const b = r.members.find(m => m.userId === 'u2')!;

  check('assigned conta só as da pessoa', a.assigned === 3 && b.assigned === 3);
  check('completed por pessoa', a.completed === 2 && b.completed === 0);
  check('open = atribuídas - concluídas', a.open === 1 && b.open === 3);
  check('overdue por pessoa', b.overdue === 1 && a.overdue === 0);
  check('completionRate por pessoa (2/3 => 67)', a.completionRate === 67);
  check('membro mais sobrecarregado vem primeiro', r.members[0].userId === 'u2');

  const semTarefas = buildTeamReport([], [ana], []);
  check(
    'membro sem tarefas => completionRate 0, sem divisão por zero',
    semTarefas.members[0].completionRate === 0,
  );
}

// ---------- Progresso por projeto ----------
{
  const tasks = [
    t({ projectId: 'p1', status: 'completed' }),
    t({ projectId: 'p1' }),
    t({ projectId: 'p2', status: 'completed' }),
    t({ projectId: 'p2', status: 'completed' }),
    t({ projectId: 'p2', dueDate: iso(-1) }),
  ];
  const r = buildTeamReport(tasks, [], [projA, projB]);
  const a = r.projects.find(p => p.id === 'p1')!;
  const b = r.projects.find(p => p.id === 'p2')!;

  check('tarefas por projeto', a.tasks === 2 && b.tasks === 3);
  check('progresso por projeto (1/2 => 50, 2/3 => 67)', a.progress === 50 && b.progress === 67);
  check('atrasadas por projeto', b.overdue === 1 && a.overdue === 0);
  check('projeto mais travado vem primeiro', r.projects[0].id === 'p1');
}

// ---------- Projeto vazio ----------
{
  const r = buildTeamReport([t({ projectId: 'p1', status: 'completed' })], [], [projA, projB]);
  check('projeto sem tarefas tem progresso 0', r.projects.find(p => p.id === 'p2')!.progress === 0);
  check('projeto sem tarefas vai para o fim (não é "travado")', r.projects[1].id === 'p2');
}

// ---------- Equipe vazia ----------
{
  const r = buildTeamReport([], [], []);
  check('equipe sem nada não quebra', r.total === 0 && r.completionRate === 0);
  check('listas vazias', r.members.length === 0 && r.projects.length === 0);
}

// ---------- Imutabilidade ----------
{
  const tasks = [t({ dono: 'u1', status: 'pending', dueDate: iso(-1) })];
  const snapshot = JSON.stringify(tasks);
  buildTeamReport(tasks, [ana], []);
  check('não muta as tarefas recebidas', JSON.stringify(tasks) === snapshot);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
