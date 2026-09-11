import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/common/Skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useTasks } from '@/hooks/useTasks';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { deriveTaskStatus } from '@/utils/taskStatus';
import { buildTeamSchedule } from '@/utils/teamSchedule';
import { Panel } from '../TeamUI';
import { TeamGantt } from '../TeamGantt';
import { TeamTaskDialog } from '../TeamTaskDialog';

interface Props {
  detail: TeamDetail;
}

/**
 * O Cronograma: QUANDO cada coisa acontece, e o que empurra o quê.
 *
 * O Painel responde onde o trabalho está parado agora; esta aba responde a
 * pergunta seguinte de quem gerencia — "o texto só começa quando o layout
 * fechar, então até quando dá?". É uma projeção da mesma lista de tarefas
 * que as outras abas olham, feita aqui (`buildTeamSchedule`) pelo mesmo
 * motivo que o relatório de carga é: "hoje" e "atrasada" são do fuso de quem
 * olha, e "bloqueada" depende de a mãe ter fechado para a equipe.
 *
 * Todo membro vê. Quem não gerencia não edita — e isso é decidido pela
 * tarefa, no diálogo, não pela aba.
 */
export const TeamSchedule: React.FC<Props> = ({ detail }) => {
  const { createTask } = useTasks();
  const { team, tasks, members, projects, loading, abilities, addTask, patchTask } = detail;
  const [criando, setCriando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  // Status derivado ANTES da projeção, como no Painel: "atrasada" é do fuso
  // de quem olha, e o servidor devolve o status cru.
  const doQuadro = useMemo(() => tasks.map(deriveTaskStatus), [tasks]);
  const schedule = useMemo(() => buildTeamSchedule(doQuadro, projects), [doQuadro, projects]);

  if (!team) return null;

  const semData =
    schedule.semData > 0
      ? `${schedule.semData} sem data${schedule.semData > 1 ? 's' : ''} não aparece${
          schedule.semData > 1 ? 'm' : ''
        } aqui`
      : null;

  return (
    <div className="space-y-6 pb-20">
      <CreateTaskModal
        isOpen={criando}
        onClose={() => setCriando(false)}
        initialProjectId={projects[0]?.id}
        onCreateTask={async data => {
          const nova = await createTask(data);
          addTask(nova);
          return nova;
        }}
      />

      <TeamTaskDialog
        task={doQuadro.find(t => t.id === aberta) ?? null}
        members={members}
        teamId={team.id}
        podeGerenciar={abilities.gerenciaTarefas}
        onClose={() => setAberta(null)}
        onAlterada={patchTask}
      />

      {loading ? (
        <Panel title="Linha do tempo">
          <div className="space-y-3">
            {['w-1/3', 'w-1/2', 'w-1/4', 'w-2/3', 'w-1/3'].map((largura, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-3.5 w-40 shrink-0" />
                <Skeleton className={`h-6 rounded-md ${largura}`} />
              </div>
            ))}
          </div>
        </Panel>
      ) : schedule.groups.length === 0 ? (
        <EmptyState
          mascotState="confused"
          title="Nenhuma tarefa com data"
          description="Dê um início ou um prazo às tarefas da equipe para vê-las na linha do tempo."
          action={
            abilities.gerenciaTarefas
              ? { label: 'Criar tarefa', onClick: () => setCriando(true) }
              : undefined
          }
        />
      ) : (
        <Panel
          title="Linha do tempo"
          action={semData && <span className="text-xs text-text-secondary">{semData}</span>}
        >
          <TeamGantt schedule={schedule} members={members} onOpen={t => setAberta(t.id)} />
        </Panel>
      )}
    </div>
  );
};
