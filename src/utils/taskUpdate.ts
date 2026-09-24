import type { Task, TaskUpdate } from '@/types/task';

/**
 * Mescla uma atualização na tarefa que está na tela.
 *
 * Superficial, como sempre foi — `updates` é parcial por natureza. O que ela
 * traduz é o vocabulário de APAGAR: no PATCH um campo se esvazia com `null`
 * (vínculos) ou `''` (texto e data), e na tarefa lida isso é simplesmente
 * "ausente". Sem a tradução, o otimismo do contexto deixaria um `null` ou um
 * `''` onde o tipo — e o resto da tela — só esperam `undefined`.
 */
export function aplicarAtualizacao(task: Task, updates: TaskUpdate): Task {
  const { dependsOnId, projectId, description, dueDate, ...resto } = updates;
  const limpando = <T,>(v: T | '' | null) => (v === '' || v === null ? undefined : v);
  return {
    ...task,
    ...resto,
    ...(dependsOnId !== undefined ? { dependsOnId: limpando(dependsOnId) } : {}),
    ...(projectId !== undefined ? { projectId: limpando(projectId) } : {}),
    ...(description !== undefined ? { description: limpando(description) } : {}),
    ...(dueDate !== undefined ? { dueDate: limpando(dueDate) } : {}),
  };
}
