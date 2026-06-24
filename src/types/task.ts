export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high';

export type AssignmentStatus = 'pending' | 'accepted' | 'rejected';

/** Tag enxuta como vem embutida na tarefa (leitura). */
export interface TaskTag {
  id: string;
  name: string;
  color: string;
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
  /** IDs das tags a aplicar — usado só no create/update (não vem da API). */
  tagIds?: string[];
}
