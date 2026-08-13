import type { Project } from '@/types/project';

/**
 * Projeto concluído sai da lista de Projetos depois de um tempo — a tela é para
 * o que está em andamento, e não para o histórico.
 *
 * Ele NÃO é apagado, e some apenas aqui, na apresentação. A API continua
 * devolvendo tudo de propósito: as tarefas precisam do projeto para exibir o
 * nome, o filtro por projeto precisa dele na lista, a separação Pessoal/Equipe
 * usa o `type` dele, e uma Ideia que dependa da conclusão precisa encontrá-lo.
 * Escondendo no servidor, tudo isso quebraria de uma vez.
 *
 * A contagem de "quantos você concluiu" não vem daqui e sim do contador do
 * usuário no servidor, que sobrevive ao projeto sumir da tela.
 */

/** Dias que um projeto concluído ainda aparece na lista. */
export const HIDE_COMPLETED_AFTER_DAYS = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Sete dias, e não três, porque as tarefas concluídas são apagadas em quatro
 * (COMPLETED_RETENTION_DAYS no back-end). Com um prazo menor que o delas o
 * projeto sumiria antes; com sete, ele acompanha as próprias tarefas até o fim
 * e só então sai — sem a janela estranha de um projeto visível já sem nada
 * dentro.
 */
export function isCompletedAndExpired(project: Project, now: number = Date.now()): boolean {
  if (!project.completedAt) return false;
  const concluidoEm = new Date(project.completedAt).getTime();
  // Data inválida (registro corrompido): mantém visível. Esconder por causa de
  // um campo que não se consegue ler seria sumir com o projeto sem motivo.
  if (Number.isNaN(concluidoEm)) return false;
  return now - concluidoEm >= HIDE_COMPLETED_AFTER_DAYS * DIA_MS;
}

export interface ProjectVisibility {
  /** O que aparece na grade. */
  visible: Project[];
  /** Concluídos há tempo demais — atrás do "mostrar concluídos". */
  hidden: Project[];
}

export function splitByVisibility(
  projects: Project[],
  now: number = Date.now(),
): ProjectVisibility {
  const visible: Project[] = [];
  const hidden: Project[] = [];
  for (const project of projects) {
    (isCompletedAndExpired(project, now) ? hidden : visible).push(project);
  }
  return { visible, hidden };
}
