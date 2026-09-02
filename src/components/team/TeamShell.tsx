import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, ListChecks, LogOut, Plus, Settings2, UserPlus, Users } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Dropdown } from '@/components/common/Dropdown';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { TeamSkeleton } from '@/components/common/Skeletons';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTasks } from '@/hooks/useTasks';
import { useTeamDetail } from '@/hooks/useTeamDetail';
import { teamsService } from '@/services/teamsService';
import { TeamSummary } from '@/types/team';
import { RoleBadge } from './TeamUI';
import { InviteDialog } from './InviteDialog';
import { TeamOverview } from './views/TeamOverview';
import { TeamMyWork } from './views/TeamMyWork';
import { TeamPeople } from './views/TeamPeople';
import { TeamManage } from './views/TeamManage';

/** As abas da área, na ordem em que a pergunta aparece na cabeça de quem entra. */
const ABAS = [
  { slug: '', label: 'Painel', icon: LayoutDashboard, gestao: false },
  { slug: 'meu-trabalho', label: 'Meu trabalho', icon: ListChecks, gestao: false },
  { slug: 'pessoas', label: 'Pessoas', icon: Users, gestao: false },
  { slug: 'gestao', label: 'Gestão', icon: Settings2, gestao: true },
] as const;

/**
 * A área de equipe inteira: cabeçalho, troca de equipe, abas e a visão aberta.
 *
 * A equipe selecionada e a aba vivem na URL (`/team/:teamId/:aba`), e não em
 * estado local. Antes, a seleção era um `useState`: recarregar a página voltava
 * para a primeira equipe, e não havia como mandar a alguém o link do painel de
 * um time específico. Endereço é o que torna uma tela compartilhável.
 *
 * A DIVISÃO por aba é o outro ponto. A versão anterior era uma tela só, igual
 * para todo mundo, com os botões de administração escondidos atrás de `isOwner`
 * — quem tinha poder de gerente não via nada dele. Agora cada pergunta tem
 * lugar: o que a equipe está fazendo (Painel), o que EU devo (Meu trabalho),
 * quem carrega o quê (Pessoas) e quem manda em quê (Gestão).
 */
export const TeamShell: React.FC = () => {
  const { account } = useAuth();
  const toast = useToast();
  const { refresh: refreshTasks } = useTasks();
  const navigate = useNavigate();
  const { teamId: teamIdDaUrl, tab } = useParams<{ teamId?: string; tab?: string }>();
  const userId = account?.id;

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const showSkeleton = useDeferredLoading(loadingTeams);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const loadTeams = useCallback(async () => {
    if (!userId) return [] as TeamSummary[];
    setLoadingTeams(true);
    try {
      const lista = await teamsService.listTeams();
      setTeams(lista);
      return lista;
    } finally {
      setLoadingTeams(false);
    }
  }, [userId]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  /**
   * A equipe da URL, quando ela existe e é minha. Um id inválido (equipe
   * excluída, link de um time do qual a pessoa saiu) NÃO mostra erro: cai na
   * primeira equipe, que é o desfecho útil. O efeito abaixo corrige o endereço.
   */
  const teamId = useMemo(() => {
    if (teamIdDaUrl && teams.some(t => t.id === teamIdDaUrl)) return teamIdDaUrl;
    return teams[0]?.id ?? null;
  }, [teamIdDaUrl, teams]);

  useEffect(() => {
    if (loadingTeams || !teamId) return;
    if (teamId !== teamIdDaUrl) navigate(`/team/${teamId}`, { replace: true });
  }, [loadingTeams, teamId, teamIdDaUrl, navigate]);

  const detail = useTeamDetail(teams, teamId);
  const { team, abilities } = detail;

  const abaAtual = ABAS.find(a => a.slug === (tab ?? '')) ?? ABAS[0];
  // Gestão pedida por link direto por quem não pode: volta ao painel em vez de
  // mostrar uma tela vazia (ou, pior, os controles inertes).
  const aba = abaAtual.gestao && !abilities.veGestao ? ABAS[0] : abaAtual;

  const irPara = (slug: string) => navigate(`/team/${teamId}${slug ? `/${slug}` : ''}`);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = newName.trim();
    if (!nome) {
      setCreateError('Dê um nome à equipe.');
      return;
    }
    try {
      setCreating(true);
      const nova = await teamsService.createTeam(nome);
      setNewName('');
      setShowCreate(false);
      await loadTeams();
      navigate(`/team/${nova.id}`);
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  /**
   * Sair da equipe fica no CABEÇALHO, e não na aba de Gestão.
   *
   * Gestão só existe para gerente e acima — deixar a saída lá prenderia na
   * equipe exatamente quem mais precisa dela: o membro comum. Foi o mesmo
   * problema que a versão anterior tinha por outro caminho (só o dono podia
   * remover alguém).
   */
  const sairDaEquipe = async () => {
    if (!teamId) return;
    setConfirmarSaida(false);
    try {
      await teamsService.leaveTeam(teamId);
      toast.success('Você saiu da equipe.');
      // "Minhas Tarefas" inclui as tarefas das equipes do usuário. Sem este
      // refresh, as da equipe que ele acabou de deixar continuariam na lista —
      // e dariam erro ao serem abertas, porque o acesso já foi revogado.
      const restantes = await loadTeams();
      await refreshTasks();
      navigate(restantes[0] ? `/team/${restantes[0].id}` : '/team', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível sair da equipe.');
    }
  };

  const conteudo = () => {
    if (!team) return null;
    switch (aba.slug) {
      case 'meu-trabalho':
        return <TeamMyWork detail={detail} userId={userId ?? ''} />;
      case 'pessoas':
        return <TeamPeople detail={detail} userId={userId ?? ''} />;
      case 'gestao':
        return (
          <TeamManage
            detail={detail}
            userId={userId ?? ''}
            onTeamsChanged={loadTeams}
            onOpenInvite={() => setShowInvite(true)}
          />
        );
      default:
        return <TeamOverview detail={detail} onIrPara={irPara} />;
    }
  };

  return (
    <AppLayout
      onNewTask={() => setShowCreate(true)}
      actionLabel="Criar equipe"
      title="Equipe"
      subtitle="Quem faz o quê, e como o trabalho está distribuído."
    >
      <PageTour id="team" />

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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
              className="flex-1 rounded-xl"
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={creating} className="flex-1 rounded-xl">
              Criar equipe
            </Button>
          </div>
        </form>
      </Modal>

      {team && (
        <InviteDialog
          isOpen={showInvite}
          onClose={() => setShowInvite(false)}
          teamId={team.id}
        />
      )}

      {loadingTeams && teams.length === 0 ? (
        showSkeleton ? (
          <TeamSkeleton />
        ) : null
      ) : teams.length === 0 ? (
        <EmptyState
          mascotState="confused"
          title="Você ainda não tem uma equipe"
          description="Crie uma equipe para colaborar e distribuir tarefas entre as pessoas."
          action={{ label: 'Criar equipe', onClick: () => setShowCreate(true) }}
        />
      ) : (
        team && (
          <div>
            {/* Cabeçalho de contexto: solto no fundo, sem caixa. A cor da
                equipe entra como uma barra fina à esquerda do nome — identidade
                sem pintar um bloco inteiro. */}
            <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className="h-7 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: team.color }}
                    aria-hidden
                  />
                  <h1 className="min-w-0 truncate text-2xl font-extrabold tracking-tight text-text-primary">
                    {team.name}
                  </h1>
                  <RoleBadge role={team.role} />
                </div>
                <p className="mt-1.5 pl-4 text-sm text-text-secondary">
                  {team.memberCount} {team.memberCount === 1 ? 'pessoa' : 'pessoas'}
                  {detail.projects.length > 0 && (
                    <>
                      {' · '}
                      {detail.projects.length}{' '}
                      {detail.projects.length === 1 ? 'projeto' : 'projetos'}
                    </>
                  )}
                  {/* O papel aparece por extenso porque a escada é nova: só o
                      selo não conta a quem não conhece os quatro níveis. */}
                  {' · '}
                  {abilities.gerenciaTarefas
                    ? 'você distribui o trabalho aqui'
                    : 'você entrega tarefas aqui'}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {teams.length > 1 && (
                  <Dropdown
                    size="sm"
                    menuAlign="right"
                    value={team.id}
                    onChange={id => navigate(`/team/${id}${aba.slug ? `/${aba.slug}` : ''}`)}
                    options={teams.map(t => ({ value: t.id, label: t.name }))}
                  />
                )}
                <Button
                  onClick={() => setShowCreate(true)}
                  variant="secondary"
                  size="sm"
                  icon={<Plus size={16} />}
                  className="rounded-xl"
                >
                  Nova equipe
                </Button>
                {abilities.convida && (
                  <Button
                    onClick={() => setShowInvite(true)}
                    size="sm"
                    icon={<UserPlus size={16} />}
                    className="rounded-xl"
                  >
                    Convidar
                  </Button>
                )}
                {!abilities.ehDono && (
                  <button
                    type="button"
                    onClick={() => setConfirmarSaida(true)}
                    title="Sair da equipe"
                    aria-label="Sair da equipe"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            </header>

            {/* Abas com sublinhado, e não pílulas: a navegação da área não pode
                pesar mais que o conteúdo dela. */}
            <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
              {ABAS.filter(a => !a.gestao || abilities.veGestao).map(item => {
                const Icon = item.icon;
                const ativa = item.slug === aba.slug;
                const pendentes = item.slug === 'gestao' ? detail.requests.length : 0;
                return (
                  <button
                    key={item.slug || 'painel'}
                    type="button"
                    onClick={() => irPara(item.slug)}
                    aria-current={ativa ? 'page' : undefined}
                    className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                      ativa
                        ? 'border-primary-vibrant text-primary-vibrant'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                    {pendentes > 0 && (
                      <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {pendentes}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {conteudo()}

            <ConfirmDialog
              isOpen={confirmarSaida}
              title="Sair da equipe?"
              message={`Você deixará de fazer parte de "${team.name}" e perderá acesso aos projetos e tarefas dela.`}
              hint={
                <>
                  O que você criou na equipe continua lá, para não apagar o trabalho do time.
                  Tarefas atribuídas a você ficam sem responsável.
                  <span className="mt-2 block">
                    Para voltar, será preciso um novo convite de alguém da equipe.
                  </span>
                </>
              }
              confirmLabel="Sair da equipe"
              cancelLabel="Cancelar"
              tone="danger"
              icon={<LogOut size={22} />}
              onConfirm={sairDaEquipe}
              onClose={() => setConfirmarSaida(false)}
            />
          </div>
        )
      )}
    </AppLayout>
  );
};
