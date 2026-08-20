import React from 'react';
import { TeamMember } from '@/types/team';

interface Props {
  members: TeamMember[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

/**
 * Quem responde por uma tarefa de equipe.
 *
 * Caixas de marcar, e não um menu suspenso: a pergunta virou "quais destas
 * pessoas?", e um menu esconderia quem já está marcado — justamente o que se
 * precisa ver ao editar.
 *
 * Componente único porque criar e editar fazem a mesma pergunta. Duas cópias
 * divergem, e a primeira a divergir é sempre a que ninguém está olhando.
 */
export const AssigneeSelector: React.FC<Props> = ({ members, value, onChange, disabled }) => (
  <div>
    <p className="mb-2 text-sm font-medium text-text-primary">Quem responde por esta tarefa</p>

    {members.length === 0 ? (
      <p className="text-sm text-text-soft">Esta equipe ainda não tem outros membros.</p>
    ) : (
      <div className="flex flex-col gap-1">
        {members.map(m => {
          const marcado = value.includes(m.userId);
          return (
            <label
              key={m.userId}
              className="flex min-h-[40px] cursor-pointer items-center gap-2.5 rounded-lg px-1 hover:bg-bg-secondary sm:min-h-0 sm:py-1"
            >
              <input
                type="checkbox"
                checked={marcado}
                disabled={disabled}
                onChange={() =>
                  onChange(marcado ? value.filter(id => id !== m.userId) : [...value, m.userId])
                }
                className="h-4 w-4 shrink-0 accent-primary-vibrant"
              />
              <span className="text-sm text-text-primary">
                {m.name}
                {m.role === 'owner' && <span className="ml-1 text-xs text-text-soft">(dono)</span>}
              </span>
            </label>
          );
        })}
      </div>
    )}

    {value.length > 1 && (
      <p className="mt-1.5 text-xs text-text-secondary">
        Todos precisam concluir para a tarefa fechar na equipe. Cada um vê como concluída
        assim que entrega a parte dele.
      </p>
    )}
  </div>
);
