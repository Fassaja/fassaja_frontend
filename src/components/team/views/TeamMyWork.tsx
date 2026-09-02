import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeletons';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { deriveTaskStatus } from '@/utils/taskStatus';
import { Panel, PanelLink, SectionEmpty, TeamNumbers } from '../TeamUI';
import { TeamTaskRow } from '../TeamTaskRow';

interface Props {
  detail: TeamDetail;
  userId: string;
}

/**
 * Meu trabalho: o que ESTA equipe espera de mim.
 *
 * A aba existe porque a área inteira era escrita do ponto de vista de quem
 * administra. Um membro entrava, via a carga de todo mundo, o progresso dos
 * projetos, a taxa de conclusão do time — e saía sem saber o que precisava
 * fazer. A pergunta mais comum da equipe não tinha tela.
 *
 * O recorte é a interseção de duas coisas que a API já devolve: as tarefas
 * desta equipe e as que têm o meu id na lista de responsáveis.
 */
export const TeamMyWork: React.FC<Props> = ({ detail, userId }) => {
  const navigate = useNavigate();
  const { team, tasks, members, loading } = detail;

  const minhas = useMemo(() => {
    const derivadas = tasks.map(deriveTaskStatus);
    return derivadas.filter(t => (t.assignees ?? []).some(a => a.id === userId));
  }, [tasks, userId]);

  /**
   * "Entreguei" é a MINHA entrega, não o estado da tarefa.
   *
   * Numa tarefa de três em que só eu terminei, a tarefa continua aberta para a
   * equipe — mas para mim ela está feita, e listá-la como pendência seria
   * cobrar duas vezes a mesma coisa.
   */
  const separadas = useMemo(() => {
    const entreguei = (t: (typeof minhas)[number]) =>
      (t.assignees ?? []).some(a => a.id === userId && a.done);
    return {
      atrasadas: minhas.filter(t => !entreguei(t) && t.status === 'overdue'),
      abertas: minhas.filter(t => !entreguei(t) && t.status !== 'overdue'),
      feitas: minhas.filter(entreguei),
    };
  }, [minhas, userId]);

  if (!team) return null;
  const base = `/tasks?scope=team&team=${team.id}&assignee=${userId}`;
  const abrir = (id: string) => navigate(`/tasks?scope=team&team=${team.id}&task=${id}`);

  const secoes = [
    { titulo: 'Atrasadas', itens: separadas.atrasadas },
    { titulo: 'Em aberto', itens: separadas.abertas },
    { titulo: 'Você já entregou', itens: separadas.feitas },
  ].filter(s => s.itens.length > 0);

  return (
    <div className="max-w-4xl space-y-6 pb-20">
      <TeamNumbers
        loading={loading}
        items={[
          { label: 'Atribuídas a você', value: minhas.length },
          { label: 'Em aberto', value: separadas.abertas.length + separadas.atrasadas.length },
          { label: 'Atrasadas', value: separadas.atrasadas.length, alert: true },
          { label: 'Você entregou', value: separadas.feitas.length },
        ]}
      />

      {loading ? (
        <Panel title="Suas tarefas">
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-14 shrink-0" />
            </div>
          ))}
        </div>
        </Panel>
      ) : minhas.length === 0 ? (
        <Panel title="Suas tarefas">
          <SectionEmpty>
            Nada atribuído a você nesta equipe. Quando alguém da gestão delegar uma tarefa, ela
            aparece aqui.
          </SectionEmpty>
        </Panel>
      ) : (
        secoes.map(secao => (
          <Panel
            key={secao.titulo}
            title={secao.titulo}
            action={
              <span className="text-xs font-semibold tabular-nums text-text-secondary">
                {secao.itens.length}
              </span>
            }
          >
            <div className="divide-y divide-border">
              {secao.itens.map(t => (
                <TeamTaskRow
                  key={t.id}
                  task={t}
                  members={members}
                  mostrarResponsaveis={false}
                  onOpen={task => abrir(task.id)}
                />
              ))}
            </div>
          </Panel>
        ))
      )}

      {minhas.length > 0 && (
        <div className="flex justify-center">
          <PanelLink onClick={() => navigate(base)}>
            Abrir em Minhas Tarefas <ArrowRight size={13} />
          </PanelLink>
        </div>
      )}
    </div>
  );
};
