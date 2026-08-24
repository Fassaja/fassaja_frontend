import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Dropdown } from '@/components/common/Dropdown';
import { AssigneeSelector } from './AssigneeSelector';
import { teamsService } from '@/services/teamsService';
import { TeamMember, TeamSummary } from '@/types/team';

/**
 * Delegar uma tarefa que NÃO está em projeto de equipe.
 *
 * Existe porque antes era impossível: para pedir uma coisa a alguém era
 * preciso criar um projeto de equipe só para ela. A tarefa solta é o caso mais
 * comum de delegação — "me manda o relatório" não merece um projeto.
 *
 * A equipe é ESCOLHIDA, não deduzida de "com quem eu compartilho time".
 * Inferir funcionaria enquanto duas pessoas compartilhassem exatamente uma
 * equipe, e quebraria em silêncio no dia em que compartilhassem duas —
 * mandando a tarefa para o time errado sem ninguém perceber.
 */
export const DelegarSemProjeto: React.FC<{
  teamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  assigneeIds: string[];
  onAssigneesChange: (ids: string[]) => void;
  disabled?: boolean;
}> = ({ teamId, onTeamChange, assigneeIds, onAssigneesChange, disabled }) => {
  const [equipes, setEquipes] = useState<TeamSummary[]>([]);
  const [membros, setMembros] = useState<TeamMember[]>([]);

  useEffect(() => {
    let vivo = true;
    teamsService
      .listTeams()
      .then(l => vivo && setEquipes(l))
      .catch(() => vivo && setEquipes([]));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    if (!teamId) {
      setMembros([]);
      return;
    }
    let vivo = true;
    teamsService
      .getMembers(teamId)
      .then(l => vivo && setMembros(l))
      .catch(() => vivo && setMembros([]));
    return () => {
      vivo = false;
    };
  }, [teamId]);

  // Sem equipe nenhuma não há a quem delegar. Mostrar um seletor vazio seria
  // oferecer o que não existe.
  if (equipes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
        <UserPlus size={15} className="text-text-soft" />
        Delegar para alguém
      </span>

      <Dropdown
        options={[
          { value: '', label: 'Não delegar' },
          ...equipes.map(e => ({ value: e.id, label: e.name })),
        ]}
        value={teamId ?? ''}
        onChange={v => {
          onTeamChange(v || null);
          // Trocar de equipe zera os escolhidos: os responsáveis eram da
          // equipe anterior, e mantê-los mandaria o servidor recusar a lista
          // inteira por causa de gente que não é do time novo.
          onAssigneesChange([]);
        }}
        placeholder="Escolha a equipe"
        size="sm"
        disabled={disabled}
      />

      {teamId && (
        <AssigneeSelector
          members={membros}
          value={assigneeIds}
          onChange={onAssigneesChange}
          disabled={disabled}
        />
      )}
    </div>
  );
};
