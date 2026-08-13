export interface Project {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
  type?: 'solo' | 'team';
  teamId?: string;
  teamName?: string;
  /** Dono do projeto. Apenas ele pode editar/excluir (projetos de equipe são lidos por todos). */
  ownerId?: string;
  /** Quando o projeto foi concluído. Ausente = em andamento. Quem define é o servidor. */
  completedAt?: string;
}
