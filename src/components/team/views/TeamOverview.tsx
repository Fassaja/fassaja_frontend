import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeletons';
import { Button } from '@/components/common/Button';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useTasks } from '@/hooks/useTasks';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { sortTeamTasks } from '@/utils/teamTasks';
import { SectionEmpty, SectionTitle, TeamNumbers } from '../TeamUI';
import { TeamTaskRow } from '../TeamTaskRow';

interface Props {
  detail: TeamDetail;
  onIrPara: (slug: string) => void;
}

/**
 * O Painel: o estado da equipe hoje.
 *
 * Responde três perguntas, em ordem: quanto trabalho está aberto (os números),
 * quais frentes estão travadas (projetos) e o que está acontecendo agora
 * (tarefas). Nada aqui é um beco sem saída — todo item leva ao lugar onde se
 * age sobre ele.
 */
export const TeamOverview: React.FC<Props> = ({ detail, onIrPara }) => {
  const navigate = useNavigate();
  const { createTask } = useTasks();
  const { team, report, tasks, members, loading, abilities, refresh } = detail;
  const [criando, setCriando] = useState(false);

  if (!team) return null;

  const teamId = team.id;
  const base = `/tasks?scope=team&team=${teamId}`;
  const visiveis = sortTeamTasks(tasks).slice(0, 7);

  return (
    <div className="space-y-8">
      <CreateTaskModal
        isOpen={criando}
        onClose={() => setCriando(false)}
        onCreateTask={async data => {
          const nova = await createTask(data);
          // Sem isto, a tarefa recém-criada não apareceria no painel até a
          // próxima visita: o detalhe da equipe é carregado uma vez por
          // seleção, e o contexto de tarefas é outra lista.
          await refresh();
          return nova;
        }}
      />

      <TeamNumbers
        loading={loading}
        items={[
          { label: 'Tarefas abertas', value: report.open },
          { label: 'Atrasadas', value: report.overdue, alert: true },
          {
            label: 'Sem responsável',
            value: report.unassigned,
            alert: true,
            hint: 'Tarefas que ninguém pegou — o gargalo silencioso de toda equipe.',
          },
          { label: 'Conclusão', value: `${report.completionRate}%` },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionTitle>Projetos</SectionTitle>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : report.projects.length === 0 ? (
            <SectionEmpty
              action={
                <Button size="sm" variant="secondary" className="rounded-xl" onClick={() => navigate('/projects')}>
                  Ir para Projetos
                </Button>
              }
            >
              Nenhum projeto de equipe ainda.
            </SectionEmpty>
          ) : (
            /* Lista, e não carrossel. O carrossel mostrava um projeto por vez e
               escondia os outros atrás de setas — mas a pergunta de quem
               administra é comparativa ("qual está travado?"), e comparar exige
               ver junto. A ordem vem do relatório: o mais travado primeiro. */
            <ul className="space-y-3.5">
              {report.projects.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`${base}&project=${p.id}`)}
                    className="group w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-bg-secondary/70"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary group-hover:text-primary-vibrant">
                        {p.name}
                      </span>
                      {p.overdue > 0 && (
                        <span className="shrink-0 text-xs font-bold tabular-nums text-danger">
                          {p.overdue} atrasada{p.overdue > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-text-secondary">
                        {p.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div
                        className="h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-3">
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => navigate(base)}
                className="inline-flex items-center gap-1 text-xs font-semibold normal-case tracking-normal text-primary-vibrant transition-colors hover:text-primary-hover"
              >
                Ver todas <ArrowRight size={13} />
              </button>
            }
          >
            Tarefas da equipe
          </SectionTitle>

          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-[18px] w-[18px] shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3 w-14 shrink-0" />
                </div>
              ))}
            </div>
          ) : visiveis.length === 0 ? (
            <SectionEmpty>Nenhuma tarefa nos projetos da equipe ainda.</SectionEmpty>
          ) : (
            <div className="divide-y divide-border">
              {visiveis.map(t => (
                <TeamTaskRow
                  key={t.id}
                  task={t}
                  members={members}
                  onOpen={task => navigate(`${base}&task=${task.id}`)}
                />
              ))}
            </div>
          )}

          {/* "Nova tarefa" abre a criação DE VERDADE. Antes este botão levava a
              uma lista — o rótulo prometia uma coisa e a tela entregava outra. */}
          {abilities.gerenciaTarefas && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
            >
              <Plus size={16} /> Nova tarefa
            </button>
          )}
        </section>
      </div>

      {/* Atalho para a carga de cada pessoa. O Painel responde pela equipe; a
          pergunta seguinte — "quem está afogado?" — tem tela própria. */}
      <section>
        <SectionTitle
          action={
            <button
              type="button"
              onClick={() => onIrPara('pessoas')}
              className="inline-flex items-center gap-1 text-xs font-semibold normal-case tracking-normal text-primary-vibrant transition-colors hover:text-primary-hover"
            >
              Ver carga de cada um <ArrowRight size={13} />
            </button>
          }
        >
          Distribuição
        </SectionTitle>
        <p className="text-sm text-text-secondary">
          {report.unassigned > 0 ? (
            <>
              <strong className="font-semibold text-danger">{report.unassigned}</strong>{' '}
              {report.unassigned === 1 ? 'tarefa está' : 'tarefas estão'} sem responsável.{' '}
            </>
          ) : (
            'Todas as tarefas têm responsável. '
          )}
          {report.members[0] && report.members[0].open > 0 && (
            <>
              Quem carrega mais agora é{' '}
              <strong className="font-semibold text-text-primary">{report.members[0].name}</strong>,
              com {report.members[0].open} aberta{report.members[0].open === 1 ? '' : 's'}.
            </>
          )}
        </p>
      </section>
    </div>
  );
};
