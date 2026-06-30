import type { Task } from '@/types/task';

/**
 * Ordena as tarefas da equipe para o painel: pendentes primeiro e, dentro de
 * cada grupo, as com prazo mais próximo antes (sem prazo vão para o fim);
 * concluídas por último. Não muta o array recebido. `dueDate` é 'YYYY-MM-DD',
 * então a comparação lexicográfica já é cronológica.
 */
export function sortTeamTasks(tasks: Task[]): Task[] {
  const doneRank = (t: Task) => (t.status === 'completed' ? 1 : 0);
  return [...tasks].sort((a, b) => {
    const byDone = doneRank(a) - doneRank(b);
    if (byDone !== 0) return byDone;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}
