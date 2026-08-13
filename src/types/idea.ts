/** Estágios de maturidade. `convertida` só o servidor define, na conversão. */
export type IdeaStatus =
  | 'rascunho'
  | 'avaliando'
  | 'planejada'
  | 'pronta'
  | 'convertida'
  | 'arquivada';

export type IdeaPriority = 'low' | 'medium' | 'high';

/** Tag enxuta como vem embutida na ideia (mesma tabela das tarefas). */
export interface IdeaTag {
  id: string;
  name: string;
  color: string;
}

export interface Idea {
  id: string;
  title: string;
  description?: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  category?: string;
  color: string;
  /** 'AAAA-MM-DD' ou 'AAAA-MM' (só o mês). Texto, não Date — ver back-end. */
  startTarget?: string;
  /** Instante da próxima revisão (ISO). */
  reviewAt?: string;
  dependsOnProjectId?: string;
  dependsOnProjectName?: string;
  /** A dependência já terminou? É o que libera o "pronta para começar". */
  dependsOnProjectCompleted?: boolean;
  convertedProjectId?: string;
  createdAt: string;
  updatedAt: string;
  tags: IdeaTag[];
}

/** Campos aceitos na criação/edição (o resto é decidido pelo servidor). */
export interface IdeaInput {
  title: string;
  description?: string;
  status?: Exclude<IdeaStatus, 'convertida'>;
  priority?: IdeaPriority;
  category?: string;
  color?: string;
  startTarget?: string;
  reviewAt?: string;
  dependsOnProjectId?: string | null;
  tagIds?: string[];
}

export interface ConvertIdeaInput {
  name?: string;
  color?: string;
  description?: string;
  type?: 'solo' | 'team';
  teamId?: string | null;
}
