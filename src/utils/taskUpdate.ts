import type { Task, TaskUpdate } from '@/types/task';

/**
 * Mescla uma atualização na tarefa que está na tela.
 *
 * Superficial, como sempre foi — `updates` é parcial por natureza. A única
 * tradução é `dependsOnId: null`, que no PATCH significa "desfaz" e na tarefa
 * lida significa "ausente": sem isto o otimismo do contexto deixaria um `null`
 * onde o tipo (e a API) só têm `undefined`.
 */
export function aplicarAtualizacao(task: Task, updates: TaskUpdate): Task {
  const { dependsOnId, ...resto } = updates;
  return {
    ...task,
    ...resto,
    ...(dependsOnId !== undefined ? { dependsOnId: dependsOnId ?? undefined } : {}),
  };
}
