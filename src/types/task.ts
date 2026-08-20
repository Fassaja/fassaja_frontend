export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high';

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected';

/** Tag enxuta como vem embutida na tarefa (leitura). */
export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

/**
 * Passo de uma tarefa — o checklist que vive dentro dela.
 *
 * Deliberadamente pobre: título, feito e nada mais. Quem precisa de prazo,
 * responsável ou prioridade quer uma tarefa de verdade, não um passo.
 */
export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

/** Um responsável e se já entregou a parte dele. */
export interface Assignee {
  id: string;
  name: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  /**
   * Responsáveis, com a entrega de cada um.
   *
   * Substitui o par `assigneeId`/`assignmentStatus`, que só comportava uma
   * pessoa. Lista vazia = tarefa sem atribuição, que se comporta exatamente
   * como antes deste recurso — é o caso de toda tarefa pessoal.
   */
  assignees?: Assignee[];
  /**
   * A tarefa fechou PARA A EQUIPE (todos entregaram)?
   *
   * Discorda de `status` de propósito: quem já entregou vê `status:
   * 'completed'` enquanto `teamCompleted` ainda é false, porque falta alguém.
   */
  teamCompleted?: boolean;
  /** Tags aplicadas — devolvidas pela API na leitura. */
  tags?: TaskTag[];
  /** Passos, já na ordem. A API sempre manda a lista (vazia quando não há). */
  subtasks?: Subtask[];
  /** IDs das tags a aplicar — usado só no create/update (não vem da API). */
  tagIds?: string[];
}
