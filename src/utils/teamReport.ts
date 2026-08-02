import type { Task } from '@/types/task';
import type { TeamMember } from '@/types/team';
// Extensão explícita: este é um import de VALOR (não só de tipo), então o Node
// precisa resolvê-lo em tempo de execução ao rodar o teste de unidade direto.
// O tsconfig tem allowImportingTsExtensions, e o Vite resolve igual.
import { deriveTaskStatus } from './taskStatus.ts';

/**
 * Agregação do relatório de equipe — lógica pura, sem React, testável em Node.
 *
 * Roda no CLIENTE de propósito: "atrasada" depende do fuso LOCAL de quem olha
 * (ver deriveTaskStatus). Um relatório calculado no servidor, em UTC, marcaria
 * tarefas como atrasadas com horas de diferença do que a interface mostra.
 */

export interface MemberLoad {
  userId: string;
  name: string;
  avatar: string | null;
  title: string | null;
  /** Tarefas atribuídas a esta pessoa (em qualquer status). */
  assigned: number;
  completed: number;
  /** Pendentes + em andamento (o que ainda está na mão dela). */
  open: number;
  overdue: number;
  /** 0–100. Sem tarefas atribuídas => 0. */
  completionRate: number;
}

export interface ProjectProgress {
  id: string;
  name: string;
  color: string;
  tasks: number;
  completed: number;
  overdue: number;
  /** 0–100. Projeto sem tarefas => 0. */
  progress: number;
}

export interface TeamReport {
  total: number;
  completed: number;
  open: number;
  overdue: number;
  /** Tarefas sem responsável — o gargalo silencioso de toda equipe. */
  unassigned: number;
  /** 0–100. */
  completionRate: number;
  /** Ordenado por carga aberta (quem está mais sobrecarregado primeiro). */
  members: MemberLoad[];
  /** Ordenado por menor progresso (o que precisa de atenção primeiro). */
  projects: ProjectProgress[];
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

/**
 * Monta o relatório a partir das tarefas da equipe, dos membros e dos projetos.
 * `projects` traz nome e cor; as contagens vêm das tarefas, para que tudo saia
 * do mesmo conjunto de dados (e o total dos projetos bata com o total geral).
 */
export function buildTeamReport(
  tasks: Task[],
  members: TeamMember[],
  projects: { id: string; name: string; color: string }[],
): TeamReport {
  // Deriva "atrasada" uma única vez; daqui para frente o status é o visual.
  const derived = tasks.map(deriveTaskStatus);

  const isDone = (t: Task) => t.status === 'completed';
  const isLate = (t: Task) => t.status === 'overdue';

  const total = derived.length;
  const completed = derived.filter(isDone).length;
  const overdue = derived.filter(isLate).length;
  const unassigned = derived.filter(t => !t.assigneeId).length;

  const memberLoads: MemberLoad[] = members.map(m => {
    const mine = derived.filter(t => t.assigneeId === m.userId);
    const done = mine.filter(isDone).length;
    return {
      userId: m.userId,
      name: m.name,
      avatar: m.avatar ?? null,
      title: m.title ?? null,
      assigned: mine.length,
      completed: done,
      open: mine.length - done,
      overdue: mine.filter(isLate).length,
      completionRate: pct(done, mine.length),
    };
  });

  const projectProgress: ProjectProgress[] = projects.map(p => {
    const ofProject = derived.filter(t => t.projectId === p.id);
    const done = ofProject.filter(isDone).length;
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      tasks: ofProject.length,
      completed: done,
      overdue: ofProject.filter(isLate).length,
      progress: pct(done, ofProject.length),
    };
  });

  return {
    total,
    completed,
    open: total - completed,
    overdue,
    unassigned,
    completionRate: pct(completed, total),
    // Quem tem mais coisa aberta aparece primeiro: é onde o gestor precisa olhar.
    // Empate desempata por atrasadas, depois por nome (ordem estável e previsível).
    members: [...memberLoads].sort(
      (a, b) => b.open - a.open || b.overdue - a.overdue || a.name.localeCompare(b.name),
    ),
    // Projetos mais travados primeiro; sem tarefas vão para o fim (não há o que
    // reportar neles, e progresso 0 sem tarefas não é "atraso").
    projects: [...projectProgress].sort((a, b) => {
      if (a.tasks === 0 && b.tasks === 0) return a.name.localeCompare(b.name);
      if (a.tasks === 0) return 1;
      if (b.tasks === 0) return -1;
      return a.progress - b.progress || b.overdue - a.overdue || a.name.localeCompare(b.name);
    }),
  };
}
