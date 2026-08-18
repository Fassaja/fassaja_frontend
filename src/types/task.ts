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
  assigneeId?: string;
  assigneeName?: string;
  assignmentStatus?: AssignmentStatus;
  /** Tags aplicadas — devolvidas pela API na leitura. */
  tags?: TaskTag[];
  /** Passos, já na ordem. A API sempre manda a lista (vazia quando não há). */
  subtasks?: Subtask[];
  /** IDs das tags a aplicar — usado só no create/update (não vem da API). */
  tagIds?: string[];
}
