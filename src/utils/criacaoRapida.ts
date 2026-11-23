import type { Task, TaskStatus } from '@/types/task';
import { interpretar } from './quickParse.ts';

/**
 * Uma linha de texto → os dados de uma tarefa nova.
 *
 * É o caminho comum de quem cria sem formulário — a paleta (Ctrl+K "+ …") e a
 * linha "Adicionar tarefa" no topo de cada coluna. O intérprete é o mesmo do
 * formulário: "amanhã", "sexta", "!alta", "#tag" (só tags que já existem).
 *
 * Devolve null quando, tirando os marcadores, não sobra título.
 */
export function tarefaDoTexto(
  texto: string,
  tags: { id: string; name: string }[],
  status: TaskStatus = 'pending',
  hoje: Date = new Date(),
): Omit<Task, 'id' | 'createdAt'> | null {
  const lido = interpretar(texto, hoje, { tagsConhecidas: tags.map(t => t.name) });
  const titulo = lido.title.trim();
  if (!titulo) return null;
  const tagIds = lido.tags
    .map(nome => tags.find(t => t.name === nome)?.id)
    .filter((id): id is string => !!id);
  return {
    title: titulo,
    priority: lido.priority ?? 'medium',
    status,
    dueDate: lido.dueDate,
    tagIds: tagIds.length ? tagIds : undefined,
  };
}
