import type { Task } from '@/types/task';
import type { Project } from '@/types/project';
import type { AiOrigin, ReplanChange } from '@/services/aiService';

/**
 * Lógica pura do assistente (o Bob). Fica fora dos componentes para poder ser
 * testada sem React: é aqui que decidimos o que é elegível para cada ação e
 * como as sugestões da IA são descritas na tela.
 */

/** Rótulos de prioridade compartilhados pelos painéis do assistente. */
export const priorityLabel: Record<'low' | 'medium' | 'high', string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/** Data local de hoje em 'YYYY-MM-DD' (mesmo formato de Task.dueDate). */
export function todayLocalISO(base = new Date()): string {
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(
    base.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Rótulo curto de um dia: "hoje", "amanhã" ou "qui, 07/08".
 * Comparar as strings 'YYYY-MM-DD' já é cronológico — nada de `new Date()`, que
 * leria a data como UTC e jogaria o dia para trás no Brasil.
 */
export function dayLabel(iso: string, today = todayLocalISO()): string {
  if (iso === today) return 'hoje';
  const [y, m, d] = today.split('-').map(Number);
  const tomorrow = todayLocalISO(new Date(y, m - 1, d + 1));
  if (iso === tomorrow) return 'amanhã';
  const [ty, tm, td] = iso.split('-').map(Number);
  const weekday = new Date(ty, tm - 1, td).toLocaleDateString('pt-BR', { weekday: 'short' });
  // O pt-BR devolve "qui." — o ponto sobra no meio da frase.
  return `${weekday.replace('.', '')}, ${String(td).padStart(2, '0')}/${String(tm).padStart(2, '0')}`;
}

/** Como descrever a mudança de prazo proposta: de onde, para onde, e se atrasou. */
export function describeChange(
  change: ReplanChange,
  today = todayLocalISO(),
): { from: string; to: string; wasLate: boolean } {
  return {
    from: change.currentDueDate ? dayLabel(change.currentDueDate, today) : 'sem prazo',
    to: dayLabel(change.suggestedDueDate, today),
    wasLate: !!change.currentDueDate && change.currentDueDate < today,
  };
}

/** Liga/desliga um item da seleção, preservando a ordem de entrada. */
export function toggleSelection(selected: string[], id: string): string[] {
  return selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id];
}

/**
 * Aviso a mostrar quando a resposta não veio da IA de verdade.
 * 'no-key'   → o ambiente não tem chave (demonstração, e não custa cota);
 * 'ai-error' → a chamada falhou, mas o uso NÃO foi cobrado: dá para repetir.
 */
export function demoNotice(origin: AiOrigin): string | null {
  if (origin.generatedBy === 'ai') return null;
  return origin.demoReason === 'ai-error'
    ? 'A IA não respondeu agora, então esta é uma sugestão automática. Seu uso não foi cobrado — pode tentar de novo.'
    : 'Modo demonstração: sugestão automática, sem IA. Nada aqui consome sua cota.';
}

/** Tarefas que fazem sentido quebrar em subtarefas: as que ainda estão abertas. */
export function breakdownTargets(tasks: Task[]): Task[] {
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter(t => t.status !== 'completed')
    .sort((a, b) => {
      // Com prazo primeiro (o mais próximo no topo); sem prazo vai para o fim.
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
        return a.dueDate < b.dueDate ? -1 : 1;
      }
      if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
      return rank[a.priority] - rank[b.priority];
    });
}

/** Só projetos de equipe têm responsáveis — os outros não podem ser distribuídos. */
export function teamProjectOptions(projects: Project[]): Project[] {
  return projects.filter(p => p.type === 'team' && !!p.teamId);
}

/** Quantas tarefas abertas cada projeto tem (para o seletor do replanejamento). */
export function openTaskCount(tasks: Task[], projectId?: string): number {
  return tasks.filter(
    t => t.status !== 'completed' && (!projectId || t.projectId === projectId),
  ).length;
}

/**
 * Frase de resultado depois de aplicar. Concordância no singular/plural — é o
 * detalhe que faz o painel parecer escrito, e não montado com template.
 */
export function appliedLabel(count: number, noun: 'tarefa' | 'subtarefa'): string {
  return count === 1 ? `1 ${noun} atualizada` : `${count} ${noun}s atualizadas`;
}

/** Mensagem do Bob na tela inicial, conforme o estado da cota. */
export function bobGreeting(status: { aiEnabled: boolean; remaining: number } | null): string {
  if (!status) return 'Oi! Posso organizar suas tarefas por você.';
  if (!status.aiEnabled) return 'Estou em modo demonstração, mas dá para experimentar tudo.';
  if (status.remaining <= 0) return 'Sua cota da semana acabou. Volte em alguns dias!';
  if (status.remaining === 1) return 'Resta 1 uso da IA nesta semana — vamos usar bem.';
  return `Você ainda tem ${status.remaining} usos da IA nesta semana.`;
}
