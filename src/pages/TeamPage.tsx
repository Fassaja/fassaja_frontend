import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Crown,
  UserPlus,
  Link2,
  Copy,
  Check,
  Clock,
  FolderOpen,
  Settings,
  ShieldCheck,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
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
import { Tooltip } from '@/components/common/Tooltip';
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
import { initialsOf } from '@/contexts/UserContext';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { TeamSummary, TeamMember, PendingRequest, TeamProjectSummary } from '@/types/team';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/common/Badge';
import { Task } from '@/types/task';
import { sortTeamTasks } from '@/utils/teamTasks';
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
  const [projIndex, setProjIndex] = useState(0);
  // Carregamento do DETALHE (membros/projetos/tarefas), separado do `loading`,
  // que cobre só a lista de equipes. Sem ele, trocar de equipe mostrava as
  // seções vazias como se a equipe não tivesse nada.
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedTeam = teams.find(t => t.id === selectedId) ?? null;
  const isOwner = selectedTeam?.ownerId === userId;
  const inviteLink = inviteToken ? `${window.location.origin}/join/${inviteToken}` : '';

  // Métricas do "pulso" da equipe (derivadas dos projetos carregados).
  const activeProjects = teamProjects.filter(
    p => p.taskCount > 0 && p.completedCount < p.taskCount,
  ).length;
  const avgCompletion = teamProjects.length
    ? Math.round(
        teamProjects.reduce(
          (s, p) => s + (p.taskCount ? (p.completedCount / p.taskCount) * 100 : 0),
          0,
        ) / teamProjects.length,
      )
    : 0;
  const safeProjIndex = teamProjects.length ? Math.min(projIndex, teamProjects.length - 1) : 0;
  const currentProject = teamProjects[safeProjIndex];
  const currentPct =
    currentProject && currentProject.taskCount
      ? Math.round((currentProject.completedCount / currentProject.taskCount) * 100)
      : 0;
  const visibleTasks = sortTeamTasks(teamTasks).slice(0, 6);

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

  // Volta o carrossel de projetos ao primeiro item ao trocar de equipe.
  useEffect(() => {
    setProjIndex(0);
  }, [selectedId]);

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
        <TeamSkeleton />
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
                  { label: 'Membros', value: selectedTeam.memberCount },
                  { label: 'Projetos ativos', value: activeProjects },
                  { label: 'Conclusão média', value: avgCompletion, suffix: '%' },
                  { label: 'Pedidos pendentes', value: requests.length, alert: true },
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {detailLoading &&
                  // Tantos quantos a equipe declara ter: a contagem já veio na
                  // lista de equipes, então o espaço reservado é o certo e a
                  // grade não salta quando os membros chegam.
                  Array.from({ length: Math.min(selectedTeam.memberCount, 8) }).map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4"
                    >
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                {members.map(m => {
                  const isOwnerCard = m.role === 'owner';
                  return (
                    <div
                      key={m.userId}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors ${
                        isOwnerCard
                          ? 'border-primary-vibrant/40 bg-primary-light/25 ring-1 ring-primary-vibrant/15'
                          : 'border-border bg-surface hover:border-primary-vibrant/40'
                      }`}
                    >
                      {isOwnerCard ? (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                          <Crown size={12} /> Dono
                        </span>
                      ) : (
                        isOwner && (
                          // Posição no invólucro: com o botão absoluto, o span
                          // ficaria como caixa vazia no fluxo do card.
                          <Tooltip content="Gerenciar membro" className="absolute right-2.5 top-2.5">
                            <button
                              type="button"
                              onClick={() => setShowSettings(true)}
                              aria-label={`Gerenciar ${m.name}`}
                              className="rounded-lg p-1.5 text-text-soft transition-colors hover:bg-bg-secondary hover:text-primary-vibrant"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </Tooltip>
                        )
                      )}

                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <div
                          className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white"
                          style={{ backgroundColor: memberColor(m.userId) }}
                        >
                          {initialsOf(m.name)}
                        </div>
                      )}

                      <div className="w-full min-w-0">
                        <p className="flex items-center justify-center gap-1.5 truncate font-bold text-text-primary">
                          {m.name}
                          {isOwnerCard && <Crown size={14} className="shrink-0 text-amber-500 dark:text-amber-400" />}
                        </p>
                        <p className="truncate text-xs text-text-secondary">{m.email}</p>
                      </div>

                      {(m.title || (!isOwnerCard && m.canManageTasks)) && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {m.title && (
                            <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-vibrant">
                              {m.title}
                            </span>
                          )}
                          {!isOwnerCard && m.canManageTasks && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-vibrant">
                              <ShieldCheck size={11} /> Gerente de tarefas
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </Card>
          )}

          {/* Projetos (carrossel) + Tarefas da equipe, lado a lado */}
          {selectedTeam && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <FolderOpen size={16} className="text-primary-vibrant" /> Projetos da equipe (
                  {teamProjects.length})
                </h3>
                {teamProjects.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setProjIndex(i => (i - 1 + teamProjects.length) % teamProjects.length)
                      }
                      aria-label="Projeto anterior"
                      className="rounded-lg border border-border p-1.5 text-text-secondary transition-all hover:border-primary-vibrant/50 hover:text-primary-vibrant active:scale-95"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="w-9 text-center text-xs font-semibold tabular-nums text-text-secondary">
                      {safeProjIndex + 1}/{teamProjects.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProjIndex(i => (i + 1) % teamProjects.length)}
                      aria-label="Próximo projeto"
                      className="rounded-lg border border-border p-1.5 text-text-secondary transition-all hover:border-primary-vibrant/50 hover:text-primary-vibrant active:scale-95"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>

              {currentProject ? (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentProject.id}
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-2xl border border-border p-4"
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: currentProject.color }}
                        />
                        <p className="min-w-0 flex-1 truncate text-base font-bold text-text-primary">
                          {currentProject.name}
                        </p>
                        <span className="shrink-0 text-sm font-bold text-text-secondary">
                          {currentPct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-secondary">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: currentProject.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${currentPct}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-bg-secondary/60 p-2.5 text-center">
                          <p className="text-base font-extrabold leading-none text-text-primary">
                            {currentProject.taskCount}
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">Tarefas</p>
                        </div>
                        <div className="rounded-xl bg-bg-secondary/60 p-2.5 text-center">
                          <p className="text-base font-extrabold leading-none text-text-primary">
                            {currentProject.completedCount}
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">Concluídas</p>
                        </div>
                        <div className="rounded-xl bg-bg-secondary/60 p-2.5 text-center">
                          <p className="text-base font-extrabold leading-none text-text-primary">
                            {currentPct}%
                          </p>
                          <p className="mt-1 text-[11px] text-text-secondary">Progresso</p>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {teamProjects.length > 1 && (
                    <div className="mt-4 flex justify-center gap-1.5">
                      {teamProjects.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProjIndex(i)}
                          aria-label={`Ir para o projeto ${i + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            i === safeProjIndex
                              ? 'w-5 bg-primary-vibrant'
                              : 'w-1.5 bg-border hover:bg-text-soft'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : detailLoading ? (
                // Sem esta guarda a tela afirmava "não há projetos" enquanto a
                // resposta ainda estava a caminho.
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 rounded-xl" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  Projetos atribuídos a esta equipe aparecem aqui. Crie um projeto do tipo equipe para
                  começar a acompanhar o progresso em conjunto.
                </p>
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
                      onClick={() => navigate('/tasks')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-vibrant transition-colors hover:text-primary-hover"
                    >
                      Ver todas as tarefas <ArrowRight size={14} />
                    </button>
                  </div>

                  {visibleTasks.length > 0 ? (
                    <div className="flex-1 divide-y divide-border">
                      {visibleTasks.map(t => {
                        const due = dueLabel(t);
                        const assignee = members.find(mm => mm.userId === t.assigneeId);
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
                            {t.assigneeId ? (
                              assignee?.avatar ? (
                                <img
                                  src={assignee.avatar}
                                  alt={assignee.name}
                                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                                />
                              ) : (
                                <div
                                  title={assignee?.name ?? t.assigneeName}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                  style={{ backgroundColor: memberColor(t.assigneeId) }}
                                >
                                  {initialsOf(assignee?.name ?? t.assigneeName ?? '?')}
                                </div>
                              )
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
                    onClick={() => navigate('/tasks')}
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
