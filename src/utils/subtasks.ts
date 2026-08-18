import { Subtask } from '@/types/task';

/**
 * Teto de passos por tarefa. Precisa bater com MAX_SUBTASKS do backend
 * (src/tasks/dto/subtask.dto.ts): aqui ele serve para desabilitar o campo
 * ANTES de gastar uma requisição que voltaria com erro.
 *
 * Passando disso a lista deixa de ser um checklist e vira um projeto
 * disfarçado — e projeto é outra coisa que o app já tem.
 */
export const MAX_SUBTASKS = 30;

export interface SubtaskProgress {
  feitos: number;
  total: number;
  /** 0 a 100. Sem passos é 0, e não NaN. */
  percentual: number;
  /** Todos feitos E existe pelo menos um. Lista vazia não está "completa". */
  completo: boolean;
}

/**
 * Progresso do checklist.
 *
 * Um único lugar calcula isto porque três telas mostram o mesmo número — o
 * card, o detalhe e a barra —, e cada uma recalculando por conta própria é
 * como duas delas passam a discordar.
 */
export function subtaskProgress(subtasks: Subtask[] | undefined): SubtaskProgress {
  const lista = subtasks ?? [];
  const total = lista.length;
  const feitos = lista.filter(p => p.done).length;
  return {
    feitos,
    total,
    percentual: total === 0 ? 0 : Math.round((feitos / total) * 100),
    completo: total > 0 && feitos === total,
  };
}
