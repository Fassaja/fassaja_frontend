import { useCallback, useEffect, useMemo, useState } from 'react';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { PendingRequest, TeamActivityEntry, TeamMember, TeamProjectSummary, TeamSummary } from '@/types/team';
import { Task } from '@/types/task';
import { abilitiesOf, TeamAbilities } from '@/utils/teamPermissions';
import { buildTeamReport, TeamReport } from '@/utils/teamReport';

export interface TeamDetail {
  team: TeamSummary | null;
  members: TeamMember[];
  projects: TeamProjectSummary[];
  tasks: Task[];
  requests: PendingRequest[];
  activity: TeamActivityEntry[];
  report: TeamReport;
  abilities: TeamAbilities;
  loading: boolean;
  /** Recarrega o detalhe inteiro (após promover, remover, aprovar...). */
  refresh: () => Promise<void>;
  /** Recarrega só o que a administração muda — mais barato que o detalhe todo. */
  refreshPeople: () => Promise<void>;
  /**
   * Troca UMA tarefa na lista, sem ir ao servidor.
   *
   * Arrastar um card no quadro chamava `refresh()`: as quatro chamadas de novo,
   * 155 KB e 24 consultas por card movido — para uma mudança que o próprio
   * `updateTask` já devolveu pronta. Uma tarefa que deixou de pertencer a esta
   * equipe (mudou de projeto) sai da lista em vez de ficar como fantasma.
   */
  patchTask: (task: Task) => void;
  /** Acrescenta uma tarefa recém-criada, se ela for mesmo desta equipe. */
  addTask: (task: Task) => void;
}

const VAZIO: TeamReport = {
  total: 0,
  completed: 0,
  open: 0,
  overdue: 0,
  unassigned: 0,
  completionRate: 0,
  members: [],
  projects: [],
};

/**
 * Todo o estado de UMA equipe, num lugar só.
 *
 * As quatro telas da área (painel, meu trabalho, pessoas, gestão) olham
 * exatamente os mesmos dados sob ângulos diferentes. Carregar por tela
 * significaria quatro cópias que envelhecem em ritmos diferentes — aprovar um
 * pedido em "Gestão" e a contagem de membros do cabeçalho continuar a antiga.
 *
 * Duas correções herdadas da versão anterior e mantidas aqui de propósito:
 *
 * 1. LIMPA ANTES de buscar. Sem isso, ao trocar de equipe os membros da
 *    anterior seguiam na tela sob o nome da nova — dado errado exibido como se
 *    fosse certo.
 * 2. GUARDA DE CORRIDA. Trocando rápido, a resposta da primeira podia chegar
 *    depois da segunda e sobrescrevê-la de forma permanente.
 */
export function useTeamDetail(teams: TeamSummary[], teamId: string | null): TeamDetail {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [projects, setProjects] = useState<TeamProjectSummary[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [activity, setActivity] = useState<TeamActivityEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [geracao, setGeracao] = useState(0);

  const team = useMemo(() => teams.find(t => t.id === teamId) ?? null, [teams, teamId]);
  const abilities = useMemo(() => abilitiesOf(team?.role), [team?.role]);

  useEffect(() => {
    if (!teamId) {
      setMembers([]);
      setProjects([]);
      setTasks([]);
      setRequests([]);
      setActivity([]);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setMembers([]);
    setProjects([]);
    setTasks([]);
    setRequests([]);
    setActivity([]);

    /*
     * Pedidos e histórico só para quem pode vê-los. Pedi-los sempre geraria um
     * 403 por visita de cada membro comum — ruído no log do servidor que
     * esconde os 403 que realmente importam.
     */
    Promise.all([
      teamsService.getMembers(teamId).catch(() => [] as TeamMember[]),
      teamsService.getProjects(teamId).catch(() => [] as TeamProjectSummary[]),
      teamsService.getTasks(teamId).catch(() => [] as Task[]),
      abilities.convida
        ? invitesService.listRequests(teamId).catch(() => [] as PendingRequest[])
        : Promise.resolve([] as PendingRequest[]),
      abilities.veGestao
        ? teamsService.getActivity(teamId).catch(() => [] as TeamActivityEntry[])
        : Promise.resolve([] as TeamActivityEntry[]),
    ]).then(([m, p, t, r, a]) => {
      if (cancelado) return;
      setMembers(m);
      setProjects(p);
      setTasks(t);
      setRequests(r);
      setActivity(a);
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [teamId, abilities.convida, abilities.veGestao, geracao]);

  const refresh = useCallback(async () => {
    setGeracao(g => g + 1);
  }, []);

  /**
   * Recarrega pessoas, pedidos e histórico sem mexer em tarefas e projetos.
   *
   * Existe porque as ações de gestão (promover, remover, aprovar) não tocam a
   * lista de tarefas, e recarregá-la faria a tela inteira piscar em branco a
   * cada clique num menu de papel.
   */
  const refreshPeople = useCallback(async () => {
    if (!teamId) return;
    const [m, r, a] = await Promise.all([
      teamsService.getMembers(teamId).catch(() => [] as TeamMember[]),
      abilities.convida
        ? invitesService.listRequests(teamId).catch(() => [] as PendingRequest[])
        : Promise.resolve([] as PendingRequest[]),
      abilities.veGestao
        ? teamsService.getActivity(teamId).catch(() => [] as TeamActivityEntry[])
        : Promise.resolve([] as TeamActivityEntry[]),
    ]);
    setMembers(m);
    setRequests(r);
    setActivity(a);
  }, [teamId, abilities.convida, abilities.veGestao]);

  const patchTask = useCallback(
    (task: Task) => {
      setTasks(prev => {
        const daEquipe = !task.teamId || task.teamId === teamId;
        return daEquipe
          ? prev.map(t => (t.id === task.id ? task : t))
          : prev.filter(t => t.id !== task.id);
      });
    },
    [teamId],
  );

  const addTask = useCallback(
    (task: Task) => {
      // Tarefa criada sem projeto de equipe nasce pessoal e não pertence a este
      // painel: acrescentá-la mostraria na equipe algo que a API não devolveria
      // no próximo carregamento.
      if (task.teamId !== teamId) return;
      setTasks(prev => (prev.some(t => t.id === task.id) ? prev : [task, ...prev]));
    },
    [teamId],
  );

  const report = useMemo(
    () =>
      teamId
        ? buildTeamReport(
            tasks,
            members,
            projects.map(p => ({ id: p.id, name: p.name, color: p.color })),
          )
        : VAZIO,
    [teamId, tasks, members, projects],
  );

  return {
    team,
    members,
    projects,
    tasks,
    requests,
    activity,
    report,
    abilities,
    loading,
    refresh,
    refreshPeople,
    patchTask,
    addTask,
  };
}
