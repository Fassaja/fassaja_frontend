import type { Task } from '@/types/task';

// Data local em 'YYYY-MM-DD' (mesmo formato do campo dueDate).
function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Deriva o status "atrasada" (fuso LOCAL do usuário) SÓ para tarefas PENDENTES
 * vencidas. "Em andamento" e "concluída" mantêm o status real: mover uma tarefa
 * vencida para "Em andamento" não pode jogá-la de volta na coluna Pendente.
 *
 * O servidor guarda pending/in_progress/completed; "overdue" é visual, derivado
 * no cliente (o servidor, em UTC, não conhece o fuso de quem usa). Comparar a
 * string 'YYYY-MM-DD' com hoje já é cronológico e trata "vence hoje" como NÃO
 * atrasada.
 */
export function deriveTaskStatus(task: Task): Task {
  if (task.status === 'pending' && task.dueDate && task.dueDate < localISO(new Date())) {
    return { ...task, status: 'overdue' };
  }
  return task;
}
