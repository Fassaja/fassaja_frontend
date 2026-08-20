import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Plus,
  UserPlus,
  Link2,
  Copy,
  Check,
  Clock,
  FolderOpen,
  Settings,
  CheckCircle2,
  Circle,
  Calendar,
  ListChecks,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton, TeamSkeleton } from '@/components/common/Skeletons';
import { StatStrip } from '@/components/common/StatStrip';
import { TeamSettingsModal } from '@/components/team/TeamSettingsModal';
import { AVATAR_COLORS } from '@/components/team/teamConstants';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { initialsOf } from '@/contexts/UserContext';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { TeamSummary, TeamMember, PendingRequest, TeamProjectSummary } from '@/types/team';
import { Badge } from '@/components/common/Badge';
import { Task } from '@/types/task';
import { sortTeamTasks } from '@/utils/teamTasks';
import { buildTeamReport } from '@/utils/teamReport';
import { MemberLoadRow } from '@/components/team/MemberLoadRow';
import { isToday, isTomorrow, formatDate } from '@/utils/date';

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};
const PRIORITY_VARIANT: Record<Task['priority'], 'default' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
};

// Rótulo + cor do prazo de uma tarefa no painel da equipe.
function dueLabel(t: Task): { text: string; cls: string } {
  if (t.status === 'completed') return { text: 'Concluída', cls: 'text-success' };
  if (!t.dueDate) return { text: 'Sem prazo', cls: 'text-text-soft' };
  if (isToday(t.dueDate)) return { text: 'Hoje', cls: 'text-danger' };
  if (isTomorrow(t.dueDate)) return { text: 'Amanhã', cls: 'text-amber-600 dark:text-amber-300' };
  return { text: formatDate(t.dueDate), cls: 'text-text-secondary' };
}

// Cor de avatar estável por usuário (não muda se a lista reordena).
function memberColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const TeamPage: React.FC = () => {
  const { account } = useAuth();
  const toast = useToast();
  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshProjects } = useProjects();
  const userId = account?.id;
  const navigate = useNavigate();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useDeferredLoading(loading);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [teamProjects, setTeamProjects] = useState<TeamProjectSummary[]>([]);
  const [teamTasks, setTeamTasks] = useState<Task[]>([]);
  // Carregamento do DETALHE (membros/projetos/tarefas), separado do `loading`,
  // que cobre só a lista de equipes. Sem ele, trocar de equipe mostrava as
  // seções vazias como se a equipe não tivesse nada.
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedId) ?? null;
  const isOwner = selectedTeam?.ownerId === userId;
  const inviteLink = inviteToken ? `${window.location.origin}/join/${inviteToken}` : '';
  const visibleTasks = sortTeamTasks(teamTasks).slice(0, 6);

  /**
   * Carga por pessoa, progresso por projeto e atrasos — já existiam em
   * `teamReport.ts`, mas só apareciam na tela de Relatórios. Aqui é onde a
   * decisão de redistribuir é tomada, então é aqui que o número precisa estar.
   */
  const relatorio = useMemo(
    () =>
      buildTeamReport(
        teamTasks,
        members,
        teamProjects.map(p => ({ id: p.id, name: p.name, color: p.color })),
      ),
    [teamTasks, members, teamProjects],
  );
  /** Maior carga da equipe: as barras são relativas a ela, não a um teto fixo. */
  const maiorCarga = Math.max(0, ...relatorio.members.map(m => m.open));

  const loadTeams = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await teamsService.listTeams();
      setTeams(list);
      setSelectedId(prev => (prev && list.some(t => t.id === prev) ? prev : list[0]?.id ?? null));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  /**
   * Detalhe da equipe selecionada: membros, projetos e tarefas.
   *
   * Duas correções em relação à versão anterior, que disparava as três buscas
   * soltas e ia preenchendo conforme cada uma voltava:
   *
   * 1. LIMPA ANTES. Sem isso, ao trocar de equipe os membros da anterior
   *    continuavam na tela sob o nome da nova até a resposta chegar — dado
   *    errado exibido como se fosse certo.
   *
   * 2. GUARDA DE CORRIDA. Trocando de equipe rápido, a resposta da primeira
   *    podia chegar DEPOIS da segunda e sobrescrevê-la, deixando a tela com o
   *    conteúdo da equipe errada de forma permanente. O `cancelado` descarta o
   *    resultado de uma seleção que já não está mais valendo.
   *
   * As três buscas continuam em paralelo; o Promise.all só junta o fim delas
   * para a tela trocar de uma vez, em vez de piscar em três etapas.
   */
  useEffect(() => {
    if (!selectedId) {
      setMembers([]);
      setTeamProjects([]);
      setTeamTasks([]);
      setDetailLoading(false);
      return;
    }

    let cancelado = false;
    setDetailLoading(true);
    setMembers([]);
    setTeamProjects([]);
    setTeamTasks([]);

    Promise.all([
      teamsService.getMembers(selectedId).catch(() => []),
      teamsService.getProjects(selectedId).catch(() => []),
      teamsService.getTasks(selectedId).catch(() => []),
    ]).then(([m, p, t]) => {
      if (cancelado) return;
      setMembers(m);
      setTeamProjects(p);
      setTeamTasks(t);
      setDetailLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [selectedId]);

  // Recarrega equipes (nome/cor/contagem) e a lista de membros após edições no modal.
  const handleTeamChanged = useCallback(async () => {
    await loadTeams();
    if (selectedId) {
      setMembers(await teamsService.getMembers(selectedId).catch(() => []));
    }
  }, [loadTeams, selectedId]);

  const handleTeamDeleted = useCallback(async () => {
    setShowSettings(false);
    // Excluir a equipe apaga também os projetos e as tarefas dela. Sem estes
    // refreshes, "Projetos" e "Minhas Tarefas" continuariam exibindo itens que
    // não existem mais no servidor.
    await Promise.all([loadTeams(), refreshTasks(), refreshProjects()]);
  }, [loadTeams, refreshTasks, refreshProjects]);

  const handleLeaveTeam = useCallback(async () => {
    if (!selectedId || leaving) return;
    setLeaving(true);
    try {
      await teamsService.leaveTeam(selectedId);
      toast.success('Você saiu da equipe.');
      // Zera a seleção: a equipe não está mais na lista, e loadTeams escolhe
      // a primeira que sobrou (ou mostra o estado vazio).
      setSelectedId(null);
      // "Minhas Tarefas" inclui as tarefas das equipes do usuário (findAll no
      // back). Sem este refresh, as tarefas da equipe que ele acabou de deixar
      // continuariam na lista até a próxima atualização — e dariam erro ao
      // serem abertas, porque o acesso já foi revogado.
      await Promise.all([loadTeams(), refreshTasks()]);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível sair da equipe.');
    } finally {
      setLeaving(false);
    }
  }, [selectedId, leaving, loadTeams, refreshTasks, toast]);

  const loadRequests = useCallback(async () => {
    if (!selectedId || !isOwner || !userId) {
      setRequests([]);
      return;
    }
    try {
      setRequests(await invitesService.listRequests(selectedId));
    } catch {
      setRequests([]);
    }
  }, [selectedId, isOwner, userId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openInvite = async () => {
    if (!selectedId || !userId) return;
    setShowInvite(true);
    setCopied(false);
    setInviteToken('');
    setInviteLoading(true);
    try {
      const { token } = await invitesService.createInvite(selectedId);
      setInviteToken(token);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível gerar o link de convite.');
    } finally {
      setInviteLoading(false);
    }
  };

  // Revoga o link atual e gera um novo (invalida links antigos compartilhados).
  const rotateInvite = async () => {
    if (!selectedId) return;
    setCopied(false);
    setInviteToken('');
    setInviteLoading(true);
    try {
      await invitesService.revokeInvites(selectedId);
      const { token } = await invitesService.createInvite(selectedId);
      setInviteToken(token);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível gerar um novo link.');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  const decide = async (id: string, action: 'approve' | 'reject') => {
    if (!userId) return;
    try {
      await invitesService.decide(id, action);
      toast.success(action === 'approve' ? 'Pedido aprovado.' : 'Pedido recusado.');
      await loadRequests();
      if (selectedId) setMembers(await teamsService.getMembers(selectedId).catch(() => []));
      loadTeams();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível responder ao pedido.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Dê um nome à equipe.');
      return;
    }
    if (!userId) return;
    try {
      setCreating(true);
      const team = await teamsService.createTeam(newName.trim());
      setNewName('');
      setShowCreate(false);
      await loadTeams();
      setSelectedId(team.id);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout
      onNewTask={() => setShowCreate(true)}
      actionLabel="Criar equipe"
      title="Equipe"
      subtitle="As pessoas que tocam os projetos com você."
    >
      <PageTour id="team" />
      {/* Create team modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Criar equipe" size="md">
        <form onSubmit={handleCreate} className="space-y-5">
          <Input
            label="Nome da equipe"
            placeholder="Ex.: Time de Produto"
            value={newName}
            onChange={e => {
              setNewName(e.target.value);
              if (createError) setCreateError('');
            }}
            error={createError && !newName.trim() ? createError : undefined}
            autoFocus
          />
          {createError && newName.trim() && <p className="text-sm text-danger">{createError}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" isLoading={creating} className="flex-1 rounded-xl">
              Criar equipe
            </Button>
          </div>
        </form>
      </Modal>

      {/* Team settings / edit mode (owner only) */}
      {selectedTeam && isOwner && (
        <TeamSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          team={selectedTeam}
          members={members}
          projects={teamProjects}
          onChanged={handleTeamChanged}
          onDeleted={handleTeamDeleted}
        />
      )}

      {/* Invite link modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Convidar para a equipe" size="md">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Compartilhe este link. A pessoa abre, pede acesso, e você aprova aqui mesmo — nada
            automático.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-bg-secondary min-w-0">
              <Link2 size={16} className="text-text-secondary shrink-0" />
              <span className="text-sm text-text-primary truncate">
                {inviteLoading ? 'Gerando link...' : inviteLink}
              </span>
            </div>
            <Button
              onClick={copyLink}
              disabled={!inviteLink}
              icon={copied ? <Check size={16} /> : <Copy size={16} />}
              className="rounded-xl shrink-0"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">
              O link expira em 7 dias e serve para várias pessoas. Cada pedido aparece em "Pedidos
              pendentes".
            </p>
            <button
              type="button"
              onClick={rotateInvite}
              disabled={inviteLoading}
              className="shrink-0 text-xs font-semibold text-primary-vibrant hover:text-primary-hover disabled:opacity-60"
            >
              Gerar novo link
            </button>
          </div>
        </div>
      </Modal>

      {loading ? (
        showSkeleton ? <TeamSkeleton /> : null
      ) : teams.length === 0 ? (
        <EmptyState
          mascotState="confused"
          title="Você ainda não tem uma equipe"
          description="Crie uma equipe para colaborar e distribuir tarefas entre as pessoas."
          action={{ label: 'Criar equipe', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-6">
          {/* Team tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {teams.map(team => {
              const active = team.id === selectedId;
              return (
                <button
                  key={team.id}
                  onClick={() => setSelectedId(team.id)}
                  style={active ? { backgroundColor: team.color } : undefined}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-[0.97] ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'bg-surface border-border text-text-secondary hover:bg-bg-secondary'
                  }`}
                >
                  <Users size={16} />
                  {team.name}
                  <span
                    className={`min-w-[20px] text-center text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/25 text-white' : 'bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {team.memberCount}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowCreate(true)}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm font-medium text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant/50 transition-colors"
            >
              <Plus size={16} /> Nova
            </button>
          </div>

          {/* Selected team */}
          {selectedTeam && (
            <Card>
              <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedTeam.color }}
                  />
                  <div className="min-w-0">
                    {/* Sem o selo "Equipe atual": a aba correspondente já está
                        pintada acima, e a contagem de membros sai daqui porque
                        aparecia três vezes na mesma tela (aba, aqui e faixa). */}
                    <h2 className="text-lg font-bold text-text-primary truncate">{selectedTeam.name}</h2>
                    {isOwner && <p className="text-sm text-text-secondary">Você é o dono</p>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={openInvite}
                      variant="secondary"
                      size="sm"
                      icon={<UserPlus size={16} />}
                      className="flex-1 rounded-xl sm:flex-none"
                    >
                      Convidar
                    </Button>
                    <Button
                      onClick={() => setShowSettings(true)}
                      variant="secondary"
                      size="sm"
                      icon={<Settings size={16} />}
                      className="flex-1 rounded-xl sm:flex-none"
                    >
                      Gerenciar
                    </Button>
                  </div>
                )}
                {/* Quem não é dono precisa de uma saída: antes, só o dono podia
                    remover alguém — quem entrava ficava preso na equipe. */}
                {!isOwner && (
                  <div className="shrink-0">
                    <Button
                      onClick={() => setConfirmLeave(true)}
                      variant="secondary"
                      size="sm"
                      icon={<LogOut size={16} />}
                      className="w-full rounded-xl sm:w-auto"
                    >
                      Sair da equipe
                    </Button>
                  </div>
                )}
              </div>

              {/* Números da equipe. Os quatro cards com ícone colorido viraram
                  uma faixa só, a mesma do Dashboard: quatro caixas de peso
                  igual competiam entre si e com os membros logo abaixo. As
                  segundas linhas ("Total na equipe", "Em andamento", "Dos
                  projetos", "Aguardando aprovação") saíram por só repetirem o
                  rótulo que já estava acima. */}
              <StatStrip
                className="mb-5"
                loading={detailLoading}
                stats={[
                  /* Números do TRABALHO, não da administração. "Membros" e
                     "Pedidos pendentes" descreviam a equipe como cadastro; o
                     número de membros já está na lista logo abaixo, e os
                     pedidos têm o próprio bloco, com botão de aprovar.
                     Quem administra precisa saber o que está aberto, o que
                     atrasou e quanto anda. */
                  { label: 'Tarefas abertas', value: relatorio.open },
                  { label: 'Atrasadas', value: relatorio.overdue, alert: true },
                  { label: 'Sem responsável', value: relatorio.unassigned, alert: true },
                  { label: 'Conclusão', value: relatorio.completionRate, suffix: '%' },
                ]}
              />

              {isOwner && requests.length > 0 && (
                <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4">
                  <p className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500 dark:text-amber-400" /> Pedidos pendentes ({requests.length})
                  </p>
                  <div className="space-y-2">
                    {requests.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 bg-surface rounded-lg border border-border p-2.5"
                      >
                        <div className="w-9 h-9 rounded-full bg-border flex items-center justify-center text-text-secondary font-bold text-sm shrink-0">
                          {initialsOf(r.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary truncate">{r.name}</p>
                          <p className="text-xs text-text-secondary truncate">{r.email}</p>
                        </div>
                        <button
                          onClick={() => decide(r.id, 'approve')}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-success text-white hover:bg-emerald-600 active:scale-95 transition-all"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => decide(r.id, 'reject')}
                          className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-border text-danger hover:bg-rose-50 active:scale-95 transition-all"
                        >
                          Recusar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Carga da equipe. Substitui a grade de cartões de contato:
                  aquela respondia "quem está aqui", pergunta que se faz uma
                  vez; quem administra pergunta todo dia quem está afogado. */}
              <div className="divide-y divide-border">
                {detailLoading &&
                  Array.from({ length: Math.min(selectedTeam.memberCount, 6) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                      <Skeleton className="h-1.5 w-28 sm:w-40" />
                    </div>
                  ))}

                {!detailLoading &&
                  relatorio.members.map(m => {
                    const original = members.find(x => x.userId === m.userId);
                    return (
                      <MemberLoadRow
                        key={m.userId}
                        membro={m}
                        ehDono={original?.role === 'owner'}
                        gerenciaTarefas={!!original?.canManageTasks}
                        maiorCarga={maiorCarga}
                        // Só quem administra vê as ações — e a tela de ajustes
                        // é onde cargo, permissão e remoção já moram.
                        onAcoes={isOwner ? () => setShowSettings(true) : undefined}
                      />
                    );
                  })}
              </div>

            </Card>
          )}

          {/* Projetos (carrossel) + Tarefas da equipe, lado a lado */}
          {selectedTeam && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
            <Card className="flex h-full flex-col">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary">
                <FolderOpen size={16} className="text-primary-vibrant" /> Projetos da equipe
              </h3>

              {/* Lista, e não carrossel. O carrossel mostrava um projeto por
                  vez e escondia os outros atrás de setas — mas a pergunta de
                  quem administra é comparativa ("qual está travado?"), e
                  comparar exige ver junto. A ordem vem do relatório: o mais
                  travado primeiro. */}
              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : relatorio.projects.length === 0 ? (
                <p className="text-sm text-text-soft">
                  Nenhum projeto de equipe ainda. Crie um em Projetos para começar a
                  distribuir tarefas.
                </p>
              ) : (
                <ul className="flex flex-1 flex-col gap-3">
                  {relatorio.projects.map(p => (
                    <li key={p.id}>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                          {p.name}
                        </span>
                        {p.overdue > 0 && (
                          <span
                            className="shrink-0 text-xs font-bold text-danger tabular-nums"
                            title={`${p.overdue} atrasada${p.overdue > 1 ? 's' : ''}`}
                          >
                            {p.overdue} atrasada{p.overdue > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="w-9 shrink-0 text-right text-xs font-semibold text-text-secondary tabular-nums">
                          {p.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${p.progress}%`,
                            backgroundColor: p.overdue > 0 ? undefined : p.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
              </div>

              <div className="lg:col-span-3">
                <Card className="flex h-full flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                      <ListChecks size={16} className="text-primary-vibrant" /> Tarefas da equipe
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/tasks?scope=team')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-vibrant transition-colors hover:text-primary-hover"
                    >
                      Ver todas as tarefas <ArrowRight size={14} />
                    </button>
                  </div>

                  {visibleTasks.length > 0 ? (
                    <div className="flex-1 divide-y divide-border">
                      {visibleTasks.map(t => {
                        const due = dueLabel(t);
                        const responsaveis = t.assignees ?? [];
                        const done = t.status === 'completed';
                        return (
                          <div key={t.id} className="flex items-center gap-3 py-2.5">
                            {done ? (
                              <CheckCircle2 size={18} className="shrink-0 text-success" />
                            ) : (
                              <Circle size={18} className="shrink-0 text-text-soft" />
                            )}
                            <p
                              className={`min-w-0 flex-1 truncate text-sm font-medium ${
                                done ? 'text-text-soft line-through' : 'text-text-primary'
                              }`}
                            >
                              {t.title}
                            </p>
                            <span
                              className={`hidden shrink-0 items-center gap-1 text-xs font-medium sm:inline-flex ${due.cls}`}
                            >
                              <Calendar size={12} /> {due.text}
                            </span>
                            <Badge variant={PRIORITY_VARIANT[t.priority]} className="shrink-0">
                              {PRIORITY_LABEL[t.priority]}
                            </Badge>
                            {/* Uma bolinha por responsável, verde para quem
                                já entregou. Pilha sobreposta porque a linha é
                                estreita e o número de pessoas varia — o nome
                                completo fica no title. */}
                            {responsaveis.length > 0 ? (
                              <div className="flex shrink-0 -space-x-1.5">
                                {responsaveis.slice(0, 4).map(a => {
                                  const membro = members.find(mm => mm.userId === a.id);
                                  return (
                                    <div
                                      key={a.id}
                                      title={`${a.name}${a.done ? ' — entregou' : ' — ainda deve'}`}
                                      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[10px] font-bold text-white ${
                                        a.done ? 'ring-2 ring-success' : ''
                                      }`}
                                      style={{ backgroundColor: memberColor(a.id) }}
                                    >
                                      {initialsOf(membro?.name ?? a.name)}
                                    </div>
                                  );
                                })}
                                {responsaveis.length > 4 && (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-bg-secondary text-[10px] font-bold text-text-secondary">
                                    +{responsaveis.length - 4}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="h-7 w-7 shrink-0" aria-hidden="true" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : detailLoading ? (
                    <div className="flex-1 divide-y divide-border">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-2.5">
                          <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
                          <Skeleton className="h-3.5 flex-1" />
                          <Skeleton className="h-3 w-14 shrink-0" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-text-secondary">
                      Nenhuma tarefa nos projetos da equipe ainda.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => navigate('/tasks?scope=team')}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
                  >
                    <Plus size={16} /> Nova tarefa
                  </button>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmLeave}
        title="Sair da equipe?"
        message={`Você deixará de fazer parte de "${selectedTeam?.name ?? ''}" e perderá acesso aos projetos e tarefas dela.`}
        hint={
          <>
            O que você criou na equipe continua lá, para não apagar o trabalho do time. Tarefas
            atribuídas a você ficam sem responsável.
            <span className="block mt-2">
              Para voltar, será preciso um novo convite do dono da equipe.
            </span>
          </>
        }
        confirmLabel="Sair da equipe"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<LogOut size={22} />}
        onConfirm={handleLeaveTeam}
        onClose={() => setConfirmLeave(false)}
      />
    </AppLayout>
  );
};

export default TeamPage;
