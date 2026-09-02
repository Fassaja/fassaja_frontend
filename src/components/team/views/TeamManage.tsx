import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Crown,
  History,
  Link2,

  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Dropdown } from '@/components/common/Dropdown';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { initialsOf } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { TeamDetail } from '@/hooks/useTeamDetail';
import { teamsService } from '@/services/teamsService';
import { invitesService } from '@/services/invitesService';
import { AssignableRole, TeamMember } from '@/types/team';
import {
  assignableBy,
  normalizeRole,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
} from '@/utils/teamPermissions';
import { formatDate } from '@/utils/date';
import { SectionEmpty, SectionTitle, RoleBadge } from '../TeamUI';
import { memberColor } from '../TeamTaskRow';
import { TEAM_COLORS, TITLE_OPTIONS } from '../teamConstants';

interface Props {
  detail: TeamDetail;
  userId: string;
  onTeamsChanged: () => Promise<unknown>;
  onOpenInvite: () => void;
}

/**
 * Gestão: quem manda em quê, e quem entra.
 *
 * Substitui o modal "Gerenciar equipe", que escondia três abas de controles
 * atrás de um botão visível apenas para o dono. Duas coisas mudaram de fundo:
 *
 * 1. Deixou de ser modal. Administrar uma equipe não é uma tarefa de dez
 *    segundos em cima do conteúdo — é um lugar onde se fica, se compara e se
 *    desfaz. Modal com abas dentro é o formato errado para isso.
 * 2. Deixou de ser só do dono. Gerente vê convite e pedidos; admin vê também
 *    papéis e cargos; dono é o único que transfere a posse e exclui. Cada
 *    bloco declara de quem ele é.
 */
export const TeamManage: React.FC<Props> = ({ detail, userId, onTeamsChanged, onOpenInvite }) => {
  const toast = useToast();
  const navigate = useNavigate();
  const { refresh: refreshTasks } = useTasks();
  const { refresh: refreshProjects } = useProjects();
  const { team, members, requests, activity, projects, abilities, refreshPeople } = detail;

  const [nome, setNome] = useState(team?.name ?? '');
  const [cor, setCor] = useState(team?.color ?? '');
  const [salvando, setSalvando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<TeamMember | null>(null);
  const [transferindo, setTransferindo] = useState<TeamMember | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  // Ressincroniza ao trocar de equipe: sem isto, o formulário levaria o nome da
  // equipe anterior para dentro da nova e um "Salvar" distraído a renomearia.
  useEffect(() => {
    setNome(team?.name ?? '');
    setCor(team?.color ?? '');
  }, [team?.id, team?.name, team?.color]);

  if (!team) return null;
  const meuPapel = team.role;
  const alterado = nome.trim() !== team.name || cor !== team.color;
  const totalTarefas = projects.reduce((soma, p) => soma + p.taskCount, 0);

  const salvarGeral = async () => {
    const limpo = nome.trim();
    if (!limpo) {
      toast.error('Dê um nome à equipe.');
      return;
    }
    setSalvando(true);
    try {
      await teamsService.updateTeam(team.id, { name: limpo, color: cor });
      toast.success('Equipe atualizada.');
      await Promise.all([onTeamsChanged(), refreshPeople()]);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const mudarPapel = async (m: TeamMember, papel: AssignableRole) => {
    setOcupado(m.userId);
    try {
      await teamsService.setMemberRole(team.id, m.userId, papel);
      toast.success(`${m.name} agora é ${ROLE_LABEL[papel].toLowerCase()}.`);
      await refreshPeople();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível alterar o papel.');
    } finally {
      setOcupado(null);
    }
  };

  const mudarCargo = async (m: TeamMember, cargo: string) => {
    setOcupado(m.userId);
    try {
      await teamsService.setMemberTitle(team.id, m.userId, cargo);
      await refreshPeople();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível salvar o cargo.');
    } finally {
      setOcupado(null);
    }
  };

  const decidir = async (id: string, acao: 'approve' | 'reject') => {
    try {
      await invitesService.decide(id, acao);
      toast.success(acao === 'approve' ? 'Pedido aprovado.' : 'Pedido recusado.');
      await Promise.all([refreshPeople(), onTeamsChanged()]);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível responder ao pedido.');
    }
  };

  const confirmarRemocao = async () => {
    if (!removendo) return;
    const alvo = removendo;
    setRemovendo(null);
    setOcupado(alvo.userId);
    try {
      await teamsService.removeMember(team.id, alvo.userId);
      toast.success(`${alvo.name} foi removido da equipe.`);
      await Promise.all([refreshPeople(), onTeamsChanged()]);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível remover.');
    } finally {
      setOcupado(null);
    }
  };

  const confirmarTransferencia = async () => {
    if (!transferindo) return;
    const alvo = transferindo;
    setTransferindo(null);
    try {
      await teamsService.transferOwnership(team.id, alvo.userId);
      toast.success(`${alvo.name} agora é o dono da equipe.`);
      await Promise.all([refreshPeople(), onTeamsChanged()]);
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível transferir a posse.');
    }
  };

  const excluirEquipe = async () => {
    setConfirmarExclusao(false);
    try {
      await teamsService.deleteTeam(team.id);
      toast.success('Equipe excluída.');
      // Excluir a equipe apaga também os projetos e as tarefas dela. Sem estes
      // refreshes, "Projetos" e "Minhas Tarefas" seguiriam exibindo itens que
      // não existem mais no servidor.
      await Promise.all([onTeamsChanged(), refreshTasks(), refreshProjects()]);
      navigate('/team', { replace: true });
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir a equipe.');
    }
  };

  return (
    <div className="space-y-10">
      {/* --- Pedidos: primeiro, porque é o único bloco com alguém esperando do
          outro lado. --- */}
      {abilities.convida && (
        <section>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={onOpenInvite}
                className="inline-flex items-center gap-1.5 text-xs font-semibold normal-case tracking-normal text-primary-vibrant transition-colors hover:text-primary-hover"
              >
                <Link2 size={13} /> Link de convite
              </button>
            }
          >
            Pedidos para entrar
          </SectionTitle>

          {requests.length === 0 ? (
            <SectionEmpty>
              Nenhum pedido pendente. Compartilhe o link de convite para alguém entrar.
            </SectionEmpty>
          ) : (
            <div className="divide-y divide-border">
              {requests.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-xs font-bold text-text-secondary">
                    {initialsOf(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-text-primary">{r.name}</p>
                    <p className="truncate text-xs text-text-secondary">{r.email}</p>
                  </div>
                  <span className="hidden shrink-0 items-center gap-1 text-xs text-text-soft sm:inline-flex">
                    <Clock size={12} /> {formatDate(r.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => decidir(r.id, 'approve')}
                    className="inline-flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95"
                  >
                    <Check size={14} /> Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => decidir(r.id, 'reject')}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-danger transition-all hover:bg-rose-50 active:scale-95 dark:hover:bg-rose-500/10"
                  >
                    <X size={14} /> Recusar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* --- Papéis e cargos --- */}
      {abilities.administra && (
        <section>
          <SectionTitle>Papéis e cargos</SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-text-secondary">
            O <strong className="font-semibold text-text-primary">papel</strong> define o que a
            pessoa pode fazer. O <strong className="font-semibold text-text-primary">cargo</strong>{' '}
            é só um rótulo da equipe — "Designer" não dá nem tira permissão nenhuma.
          </p>

          <div className="divide-y divide-border">
            {members.map(m => {
              const papel = normalizeRole(m.role);
              const podeMudar = assignableBy(meuPapel, papel);
              const souEu = m.userId === userId;
              return (
                <div key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                  {m.avatar ? (
                    <img src={m.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: memberColor(m.userId) }}
                    >
                      {initialsOf(m.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text-primary">{m.name}</p>
                      {souEu && <span className="text-xs text-text-soft">(você)</span>}
                    </div>
                    <p className="truncate text-xs text-text-secondary">{m.email}</p>
                  </div>

                  {/* Papel: seletor quando dá para mexer, selo quando não dá.
                      Um seletor desabilitado convida a tentar e depois recusa. */}
                  {podeMudar.length > 0 ? (
                    <div className="w-44 shrink-0" title={ROLE_DESCRIPTION[papel]}>
                      <Dropdown
                        size="sm"
                        fullWidth
                        value={papel}
                        disabled={ocupado === m.userId}
                        onChange={v => mudarPapel(m, v as AssignableRole)}
                        options={podeMudar.map(r => ({ value: r, label: ROLE_LABEL[r] }))}
                      />
                    </div>
                  ) : (
                    <div className="w-44 shrink-0" title={ROLE_DESCRIPTION[papel]}>
                      <RoleBadge role={papel} />
                    </div>
                  )}

                  <div className="w-44 shrink-0">
                    <Dropdown
                      size="sm"
                      fullWidth
                      value={m.title ?? ''}
                      disabled={ocupado === m.userId || papel === 'owner'}
                      onChange={v => mudarCargo(m, v)}
                      options={TITLE_OPTIONS}
                      placeholder="Sem cargo"
                    />
                  </div>

                  <div className="flex w-16 shrink-0 justify-end gap-1">
                    {abilities.ehDono && papel !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => setTransferindo(m)}
                        disabled={ocupado === m.userId}
                        title="Tornar dono da equipe"
                        aria-label={`Tornar ${m.name} dono da equipe`}
                        className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-500/10"
                      >
                        <Crown size={16} />
                      </button>
                    )}
                    {podeMudar.length > 0 && !souEu && (
                      <button
                        type="button"
                        onClick={() => setRemovendo(m)}
                        disabled={ocupado === m.userId}
                        title="Remover da equipe"
                        aria-label={`Remover ${m.name} da equipe`}
                        className="rounded-lg p-2 text-danger transition-colors hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* --- Identidade da equipe --- */}
      {abilities.administra && (
        <section>
          <SectionTitle>Nome e cor</SectionTitle>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <label
                htmlFor="team-name"
                className="mb-1.5 block text-xs font-semibold text-text-secondary"
              >
                Nome da equipe
              </label>
              <input
                id="team-name"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-primary-vibrant/60"
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-text-secondary">Cor</p>
              <div className="flex gap-2">
                {TEAM_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                    aria-pressed={cor === c}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      cor === c ? 'scale-110 ring-2 ring-text-primary ring-offset-2 ring-offset-bg-main' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={salvarGeral}
              isLoading={salvando}
              disabled={!alterado}
              className="rounded-xl"
            >
              Salvar
            </Button>
          </div>
        </section>
      )}

      {/* --- Histórico --- */}
      <section>
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <History size={12} /> Histórico
          </span>
        </SectionTitle>
        {activity.length === 0 ? (
          <SectionEmpty>Nada registrado ainda.</SectionEmpty>
        ) : (
          <ol className="space-y-2.5">
            {activity.map(e => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" aria-hidden />
                <p className="min-w-0 flex-1 text-text-secondary">
                  <span className="text-text-primary">{e.text}</span>{' '}
                  <span className="whitespace-nowrap text-xs text-text-soft">
                    {formatDate(e.createdAt)}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* --- Saída e exclusão. Por último, com borda: é o único bloco desta
          tela que destrói algo, e ele precisa parecer diferente do resto. --- */}
      <section>
        <SectionTitle>Zona de risco</SectionTitle>
        <div className="space-y-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
          {/* Sair da equipe NÃO fica aqui: esta aba só existe para gerente e
              acima, e a saída precisa estar ao alcance do membro comum. Ela
              vive no cabeçalho da área, visível em todas as abas. */}
          {abilities.ehDono ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                Excluir a equipe apaga também os {projects.length}{' '}
                {projects.length === 1 ? 'projeto' : 'projetos'} e as {totalTarefas} tarefas dela.
                Para apenas sair, transfira a posse antes (coroa, na lista acima).
              </p>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={15} />}
                className="rounded-xl"
                onClick={() => setConfirmarExclusao(true)}
              >
                Excluir equipe
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Só o dono da equipe pode excluí-la. Para sair, use o botão no topo da página.
            </p>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={!!transferindo}
        title="Tornar dono da equipe?"
        message={`${transferindo?.name ?? ''} passará a ser o dono de "${team.name}".`}
        hint="Você continua na equipe como Gerente: segue distribuindo o trabalho, mas deixa de administrar pessoas, renomear a equipe, transferir a posse ou excluí-la."
        confirmLabel="Transferir posse"
        cancelLabel="Cancelar"
        icon={<Crown size={22} />}
        onConfirm={confirmarTransferencia}
        onClose={() => setTransferindo(null)}
      />

      <ConfirmDialog
        isOpen={!!removendo}
        title="Remover membro?"
        message={`${removendo?.name ?? ''} deixará de ter acesso aos projetos e tarefas desta equipe.`}
        hint="O que a pessoa criou aqui continua com a equipe, para não apagar o trabalho do time. Tarefas atribuídas a ela ficam sem responsável."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<UserMinus size={22} />}
        onConfirm={confirmarRemocao}
        onClose={() => setRemovendo(null)}
      />

      <ConfirmDialog
        isOpen={confirmarExclusao}
        title="Excluir equipe?"
        message={`"${team.name}" e tudo o que vive dentro dela serão apagados.`}
        hint={
          <>
            {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'} e {totalTarefas}{' '}
            {totalTarefas === 1 ? 'tarefa' : 'tarefas'} serão excluídos para todos os{' '}
            {team.memberCount} membros. Não há como desfazer.
            <span className="mt-2 block">
              Se você só quer sair, transfira a posse para outra pessoa antes.
            </span>
          </>
        }
        confirmLabel="Excluir equipe"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={excluirEquipe}
        onClose={() => setConfirmarExclusao(false)}
      />

    </div>
  );
};
