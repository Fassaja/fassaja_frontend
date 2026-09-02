import type { TaskStatus } from '@/types/task';

/**
 * As colunas do fluxo de trabalho — uma definição, dois quadros.
 *
 * O quadro completo (Minhas Tarefas) e o resumido (painel da Equipe) precisam
 * concordar sobre QUAL status mora em QUAL coluna. Duplicar a tabela era o
 * caminho mais curto para uma tarefa aparecer em "Pendente" numa tela e em
 * "Em andamento" na outra.
 *
 * Não existe "Backlog" nem "Revisão": o modelo tem três status de tarefa, e
 * inventar colunas sem estado por trás criaria gavetas onde nada nunca entra.
 */
export type ColumnKey = 'pending' | 'in_progress' | 'completed';

export const BOARD_COLUMNS: {
  key: ColumnKey;
  label: string;
  hint: string;
  color: string;
  tint: string;
  statuses: TaskStatus[];
}[] = [
  {
    key: 'pending',
    label: 'Pendente',
    hint: 'Ainda não começou',
    color: '#64748B',
    tint: 'bg-bg-secondary',
    // "overdue" (calculado no servidor) entra em Pendente: é uma tarefa não
    // concluída, só que atrasada — o card já mostra o selo vermelho.
    statuses: ['pending', 'overdue'],
  },
  {
    key: 'in_progress',
    label: 'Em andamento',
    hint: 'Em execução agora',
    color: '#2477FF',
    tint: 'bg-primary-light/50',
    statuses: ['in_progress'],
  },
  {
    key: 'completed',
    label: 'Concluída',
    hint: 'Já finalizou',
    color: '#22C55E',
    tint: 'bg-emerald-50 dark:bg-emerald-500/10',
    statuses: ['completed'],
  },
];

/** Coluna onde a tarefa vive hoje (pending e overdue caem na mesma). */
export function columnOf(status: TaskStatus): ColumnKey {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
}
