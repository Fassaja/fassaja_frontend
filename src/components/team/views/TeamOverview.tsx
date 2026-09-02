import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeletons';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { initialsOf } from '@/contexts/UserContext';
import { useTasks } from '@/hooks/useTasks';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { deriveTaskStatus } from '@/utils/taskStatus';
import { ColumnKey } from '@/utils/taskColumns';
import { TaskStatus } from '@/types/task';
import { Panel, PanelLink, SectionEmpty, TeamNumbers } from '../TeamUI';
import { TeamFlowBoard } from '../TeamFlowBoard';
import { TeamTaskDialog } from '../TeamTaskDialog';
import { memberColor } from '../TeamTaskRow';

interface Props {
  detail: TeamDetail;
  onIrPara: (slug: string) => void;
}

/**
 * O Painel: o estado da equipe hoje.
 *
 * Dois blocos, na ordem em que a pergunta aparece: quais frentes existem e
 * como cada uma anda (Projetos), e onde o trabalho está parado agora (Fluxo).
 * Acima dos dois, os quatro números que resumem a equipe.
 *
 * O Fluxo substituiu uma lista de tarefas. A lista respondia "o que existe";
 * quem administra vem aqui perguntar "onde cada coisa está" — e essa resposta
 * é uma posição, não uma linha de texto.
 */
export const TeamOverview: React.FC<Props> = ({ detail, onIrPara }) => {
  const navigate = useNavigate();
  const { createTask } = useTasks();
  const { team, report, tasks, members, projects, loading, abilities, addTask, patchTask } = detail;
  const [criando, setCriando] = useState<ColumnKey | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);

  /**
   * Status derivado ANTES do quadro: "atrasada" depende do fuso de quem olha,
   * e o servidor devolve o status cru. Sem isto, uma tarefa vencida entraria
   * em "Pendente" sem o selo vermelho — o quadro mostraria o trabalho como se
   * estivesse em dia.
   */
  const doQuadro = useMemo(() => tasks.map(deriveTaskStatus), [tasks]);

  /** Quem tem tarefa aberta em cada projeto — o rosto de quem toca a frente. */
  const rostosPorProjeto = useMemo(() => {
    const mapa = new Map<string, { id: string; name: string; avatar: string | null }[]>();
    for (const t of doQuadro) {
      if (!t.projectId || t.status === 'completed') continue;
      const atual = mapa.get(t.projectId) ?? [];
      for (const a of t.assignees ?? []) {
        if (atual.some(x => x.id === a.id)) continue;
        atual.push({
          id: a.id,
          name: members.find(m => m.userId === a.id)?.name ?? a.name,
          avatar: members.find(m => m.userId === a.id)?.avatar ?? null,
        });
      }
      mapa.set(t.projectId, atual);
    }
    return mapa;
  }, [doQuadro, members]);

  if (!team) return null;

  const base = `/tasks?scope=team&team=${team.id}`;

  return (
    /* pb-20: o assistente flutuante mora no canto inferior direito e cobria
       o link do último painel. */
    <div className="space-y-6 pb-20">
      <CreateTaskModal
        isOpen={criando !== null}
        onClose={() => setCriando(null)}
        // A coluna clicada define o status: quem aperta "Adicionar tarefa" em
        // "Em andamento" está dizendo onde ela nasce.
        initialStatus={(criando ?? undefined) as TaskStatus | undefined}
        /*
         * Projeto pré-selecionado — e visível no formulário, não escondido.
         *
         * Sem projeto, a tarefa nasce PESSOAL e não apareceria neste quadro:
         * o botão "Adicionar tarefa" da coluna criaria algo que some da tela
         * em seguida. Preencher o campo com um projeto da equipe deixa o
         * padrão à vista, e quem quiser outro troca no próprio modal.
         */
        initialProjectId={projects[0]?.id}
        onCreateTask={async data => {
          const nova = await createTask(data);
          // O painel carrega o detalhe da equipe uma vez por seleção e não
          // escuta o contexto de tarefas. Acrescentar a tarefa à lista local
          // basta — e evita rebaixar as outras três chamadas da equipe por uma
          // linha nova que já está na mão.
          addTask(nova);
          return nova;
        }}
      />

      {/* A tarefa abre AQUI, não em outra tela: quem administra veio comparar
          o que está travado, e sair do painel a cada olhada acaba com a
          comparação. */}
      <TeamTaskDialog
        task={doQuadro.find(t => t.id === aberta) ?? null}
        members={members}
        teamId={team.id}
        podeGerenciar={abilities.gerenciaTarefas}
        onClose={() => setAberta(null)}
        onAlterada={patchTask}
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
            hint: 'Tarefas que ninguém pegou — não aparecem na carga de ninguém.',
          },
          { label: 'Conclusão', value: `${report.completionRate}%` },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-4">
        <Panel
          title="Projetos ativos"
          className="xl:col-span-1"
          action={<PanelLink onClick={() => navigate('/projects')}>Ver todos</PanelLink>}
          footer={
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
            >
              Ver todos os projetos <ChevronRight size={15} />
            </button>
          }
        >
          {loading ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : report.projects.length === 0 ? (
            <SectionEmpty>
              Nenhum projeto de equipe ainda. Crie um em Projetos para começar a distribuir
              tarefas.
            </SectionEmpty>
          ) : (
            /* Lista, e não carrossel: a pergunta de quem administra é
               comparativa ("qual está travado?"), e comparar exige ver junto.
               A ordem vem do relatório — o mais travado primeiro. */
            <ul className="space-y-5">
              {report.projects.map(p => {
                const pendentes = p.tasks - p.completed;
                const rostos = rostosPorProjeto.get(p.id) ?? [];
                const concluido = p.tasks > 0 && p.progress === 100;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`${base}&project=${p.id}`)}
                      className="group w-full text-left"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary group-hover:text-primary-vibrant">
                          {p.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-text-secondary">
                          {p.progress}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {/* Sem `truncate`: com avatares na mesma linha, o
                            "1 atrasada" — a única parte que pede ação — era
                            exatamente o pedaço que sumia em "1 atra…". */}
                        <p className="min-w-0 flex-1 text-xs text-text-secondary">
                          {p.completed} concluídas • {pendentes} pendentes
                          {p.overdue > 0 && (
                            <span className="font-semibold text-danger">
                              {' '}• {p.overdue} atrasada{p.overdue > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                        {/* Rostos de quem tem tarefa ABERTA aqui. O projeto não
                            guarda "responsável"; quem responde por ele é quem
                            está com trabalho dele na mão. */}
                        {rostos.length > 0 && (
                          <div className="flex shrink-0 -space-x-1.5">
                            {rostos.slice(0, 3).map(r =>
                              r.avatar ? (
                                <img
                                  key={r.id}
                                  src={r.avatar}
                                  alt=""
                                  title={r.name}
                                  className="h-5 w-5 rounded-full border-2 border-surface object-cover"
                                />
                              ) : (
                                <span
                                  key={r.id}
                                  title={r.name}
                                  className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface text-[8px] font-bold text-white"
                                  style={{ backgroundColor: memberColor(r.id) }}
                                >
                                  {initialsOf(r.name)}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                        {concluido && (
                          <span className="shrink-0 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">
                            Concluído
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Fluxo de tarefas"
          className="xl:col-span-3"
          action={
            <PanelLink onClick={() => navigate(base)}>
              Ver todas <ArrowRight size={13} />
            </PanelLink>
          }
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : doQuadro.length === 0 ? (
            <SectionEmpty>Nenhuma tarefa nos projetos da equipe ainda.</SectionEmpty>
          ) : (
            <TeamFlowBoard
              tasks={doQuadro}
              members={members}
              onOpen={t => setAberta(t.id)}
              // Só quem distribui trabalho cria tarefa aqui — a coluna sem o
              // botão é a forma honesta de dizer isso, em vez de oferecer e
              // deixar o servidor recusar.
              onAdd={abilities.gerenciaTarefas ? status => setCriando(status) : undefined}
              onMoved={patchTask}
            />
          )}
        </Panel>
      </div>

      {/*
        Distribuição: o resumo em uma frase, com a porta para a aba Pessoas.

        O link fica NO FIM DO TEXTO, e não no canto do painel: este é o último
        bloco da página, e o assistente flutuante mora justamente ali no canto
        inferior direito — ele cobria o link inteiro.
      */}
      <Panel title="Distribuição">
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
          )}{' '}
          <button
            type="button"
            onClick={() => onIrPara('pessoas')}
            className="inline-flex items-center gap-1 font-semibold text-primary-vibrant transition-colors hover:text-primary-hover"
          >
            Ver carga de cada um <ArrowRight size={13} />
          </button>
        </p>
      </Panel>
    </div>
  );
};
