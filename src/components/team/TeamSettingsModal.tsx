import React, { useEffect, useMemo, useState } from 'react';
import {
  Settings2,
  Users,
  ListTodo,
  Crown,
  Trash2,
  Check,
  AlertTriangle,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Tooltip } from '@/components/common/Tooltip';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Dropdown } from '@/components/common/Dropdown';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { initialsOf } from '@/contexts/UserContext';
import { teamsService } from '@/services/teamsService';
import { tasksService } from '@/services/tasksService';
import { TeamSummary, TeamMember, TeamProjectSummary } from '@/types/team';
import { Task } from '@/types/task';
import { AVATAR_COLORS, TEAM_COLORS, ROLE_OPTIONS } from './teamConstants';

type Tab = 'general' | 'members' | 'tasks';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamSummary;
  members: TeamMember[];
  projects: TeamProjectSummary[];
  /** Recarrega equipes/membros no pai após uma alteração. */
  onChanged: () => void;
  /** Chamado após a exclusão da equipe. */
  onDeleted: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Geral', icon: <Settings2 size={15} /> },
  { id: 'members', label: 'Membros', icon: <Users size={15} /> },
  { id: 'tasks', label: 'Tarefas', icon: <ListTodo size={15} /> },
];


export const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({
  isOpen,
  onClose,
  team,
  members,
  projects,
  onChanged,
  onDeleted,
}) => {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('general');

  // --- Geral: nome + cor ---
  const [name, setName] = useState(team.name);
  const [color, setColor] = useState(team.color);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Membros ---
  const [busyMember, setBusyMember] = useState<string | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [transferring, setTransferring] = useState<TeamMember | null>(null);

  // Quanto trabalho a exclusão levaria junto — o aviso precisa ser concreto.
  const totalTasks = projects.reduce((sum, p) => sum + p.taskCount, 0);

  // --- Tarefas ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Ressincroniza os campos sempre que abrir ou a equipe mudar.
  useEffect(() => {
    if (isOpen) {
      setTab('general');
      setName(team.name);
      setColor(team.color);
      setTasks([]);
      setTasksLoaded(false);
    }
  }, [isOpen, team.id, team.name, team.color]);

  const dirty = name.trim() !== team.name || color !== team.color;

  const projectIds = useMemo(() => new Set(projects.map(p => p.id)), [projects]);


  // Carrega as tarefas dos projetos da equipe quando a aba é aberta.
  useEffect(() => {
    if (!isOpen || tab !== 'tasks' || tasksLoaded) return;
    let active = true;
    setTasksLoading(true);
    tasksService
      .getTasks()
      .then(all => {
        if (active) setTasks(all.filter(t => t.projectId && projectIds.has(t.projectId)));
      })
      .catch(() => {
        if (active) toast.error('Não foi possível carregar as tarefas da equipe.');
      })
      .finally(() => {
        if (active) {
          setTasksLoading(false);
          setTasksLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [isOpen, tab, tasksLoaded, projectIds, toast]);

  const saveGeneral = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Dê um nome à equipe.');
      return;
    }
    setSavingGeneral(true);
    try {
      await teamsService.updateTeam(team.id, { name: trimmed, color });
      toast.success('Equipe atualizada.');
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível salvar.');
    } finally {
      setSavingGeneral(false);
    }
  };

  const saveTitle = async (userId: string, title: string) => {
    setBusyMember(userId);
    try {
      await teamsService.setMemberTitle(team.id, userId, title);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível salvar o cargo.');
    } finally {
      setBusyMember(null);
    }
  };

  const togglePermission = async (m: TeamMember) => {
    setBusyMember(m.userId);
    try {
      await teamsService.setMemberPermissions(team.id, m.userId, !m.canManageTasks);
      toast.success(
        m.canManageTasks
          ? `${m.name} não gerencia mais as tarefas.`
          : `${m.name} agora pode gerenciar tarefas da equipe.`,
      );
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível atualizar a permissão.');
    } finally {
      setBusyMember(null);
    }
  };

  const confirmTransfer = async () => {
    if (!transferring) return;
    const target = transferring;
    setTransferring(null);
    setBusyMember(target.userId);
    try {
      await teamsService.transferOwnership(team.id, target.userId);
      toast.success(`${target.name} agora é dono da equipe.`);
      // Quem chamou deixa de ser dono: recarrega para a tela refletir isso
      // (o modal de configurações é do dono) e fecha.
      onChanged();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível transferir a posse.');
    } finally {
      setBusyMember(null);
    }
  };

  const confirmRemove = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    setBusyMember(target.userId);
    try {
      await teamsService.removeMember(team.id, target.userId);
      toast.success(`${target.name} foi removido da equipe.`);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível remover.');
    } finally {
      setBusyMember(null);
    }
  };

  /** Alterna uma pessoa na lista de responsáveis desta tarefa. */
  const toggleAssignee = async (task: Task, userId: string) => {
    setAssigning(task.id);
    const atuais = (task.assignees ?? []).map(a => a.id);
    const proximos = atuais.includes(userId)
      ? atuais.filter(id => id !== userId)
      : [...atuais, userId];
    try {
      const updated = await tasksService.assignTask(task.id, proximos);
      setTasks(prev => prev.map(t => (t.id === task.id ? updated : t)));
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível atribuir a tarefa.');
    } finally {
      setAssigning(null);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await teamsService.deleteTeam(team.id);
      toast.success('Equipe excluída.');
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível excluir a equipe.');
    }
  };

  // Agrupa as tarefas por projeto para exibir na aba "Tarefas".
  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(t => {
      if (!t.projectId) return;
      const list = map.get(t.projectId) ?? [];
      list.push(t);
      map.set(t.projectId, list);
    });
    return map;
  }, [tasks]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar equipe" size="lg">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-secondary mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-surface text-primary-vibrant shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------- GERAL ---------- */}
      {tab === 'general' && (
        <div className="space-y-5">
          <Input
            label="Nome da equipe"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome da equipe"
            maxLength={120}
          />

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Cor da equipe</label>
            <div className="flex flex-wrap gap-2.5">
              {TEAM_COLORS.map(c => {
                const selected = c === color;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Cor ${c}`}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                      selected ? 'ring-2 ring-offset-2 ring-offset-white ring-primary-dark/40' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {selected && <Check size={16} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={saveGeneral} isLoading={savingGeneral} disabled={!dirty} className="rounded-xl">
              Salvar alterações
            </Button>
          </div>

          {/* Zona de perigo */}
          <div className="mt-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-4">
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" /> Zona de perigo
            </p>
            <p className="text-xs text-text-secondary mt-1 mb-3">
              Excluir a equipe apaga também <strong>os projetos e as tarefas dela</strong>, para
              todo mundo. Se você só quer deixar a equipe, transfira a posse na aba Membros e depois
              saia — assim o trabalho continua com o time. Esta ação não pode ser desfeita.
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={15} />}
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl"
            >
              Excluir equipe
            </Button>
          </div>
        </div>
      )}

      {/* ---------- MEMBROS ---------- */}
      {tab === 'members' && (
        <div className="space-y-3">
          {members.map((m, i) => {
            const isOwner = m.role === 'owner';
            const busy = busyMember === m.userId;
            return (
              <div
                key={m.userId}
                className="flex items-start gap-3 p-3 rounded-xl border border-border"
              >
                {m.avatar ? (
                  <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {initialsOf(m.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate flex items-center gap-1.5">
                    {m.name}
                    {isOwner && <Crown size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />}
                    {!isOwner && m.canManageTasks && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-light text-primary-vibrant">
                        <ShieldCheck size={11} /> Gerente de tarefas
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{m.email}</p>
                  {isOwner ? (
                    m.title && (
                      <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary-vibrant">
                        {m.title}
                      </span>
                    )
                  ) : (
                    <>
                      <div className="mt-1.5">
                        <Dropdown
                          size="sm"
                          value={m.title ?? ''}
                          options={ROLE_OPTIONS}
                          onChange={v => saveTitle(m.userId, v)}
                          placeholder="Definir cargo"
                          disabled={busy}
                        />
                      </div>
                      <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!m.canManageTasks}
                          disabled={busy}
                          onClick={() => togglePermission(m)}
                          className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-50 ${
                            m.canManageTasks ? 'bg-primary-vibrant' : 'bg-border'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-surface shadow transition-transform ${
                              m.canManageTasks ? 'translate-x-4' : ''
                            }`}
                          />
                        </button>
                        <span className="text-xs text-text-secondary">
                          Gerente de tarefas (criar, atribuir e excluir)
                        </span>
                      </label>
                    </>
                  )}
                </div>
                {!isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Ambos ficam desabilitados enquanto `busy`; a dica segue
                        funcionando porque quem escuta é o invólucro. */}
                    <Tooltip
                      content="Tornar dono da equipe"
                      description="Passa a administração para esta pessoa. Você deixa de ser dono."
                    >
                      <button
                        onClick={() => setTransferring(m)}
                        disabled={busy}
                        aria-label={`Tornar ${m.name} dono da equipe`}
                        className="p-2 rounded-lg text-amber-600 dark:text-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        <Crown size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip
                      content="Remover da equipe"
                      description="A pessoa perde acesso aos projetos da equipe."
                    >
                      <button
                        onClick={() => setRemoving(m)}
                        disabled={busy}
                        aria-label="Remover membro"
                        className="p-2 rounded-lg text-danger hover:bg-rose-50 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- TAREFAS ---------- */}
      {tab === 'tasks' && (
        <div className="space-y-5">
          <p className="text-xs text-text-secondary">
            Atribua ou troque o responsável de cada tarefa dos projetos da equipe. A pessoa recebe
            a tarefa como proposta e pode aceitar ou recusar.
          </p>
          {tasksLoading ? (
            <p className="text-sm text-text-soft text-center py-8">Carregando tarefas…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">
              Esta equipe ainda não tem projetos.
            </p>
          ) : (
            projects.map(p => {
              const list = tasksByProject.get(p.id) ?? [];
              return (
                <div key={p.id}>
                  <p className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </p>
                  {list.length === 0 ? (
                    <p className="text-xs text-text-soft pl-4 mb-1">Sem tarefas neste projeto.</p>
                  ) : (
                    <div className="space-y-2">
                      {list.map(task => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-2.5 rounded-xl border border-border"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-text-primary truncate">{task.title}</p>
                            {/* Quantos entregaram, e quem falta pelo nome ao
                                passar o mouse: é a pergunta de quem gerencia. */}
                            {(task.assignees ?? []).length > 0 && (
                              <p
                                className="text-[11px] text-text-secondary"
                                title={(task.assignees ?? [])
                                  .map(a => `${a.name}${a.done ? ' ✓' : ''}`)
                                  .join(', ')}
                              >
                                {(task.assignees ?? []).filter(a => a.done).length} de{' '}
                                {(task.assignees ?? []).length} entregaram
                              </p>
                            )}
                          </div>
                          {/* Um botão por membro: marcar e desmarcar direto,
                              sem abrir menu. Numa tela de gestão o gesto é
                              distribuir várias tarefas seguidas, e cada menu a
                              abrir custa dois cliques a mais. */}
                          <div className="flex shrink-0 flex-wrap justify-end gap-1">
                            {members.map(m => {
                              const marcado = (task.assignees ?? []).some(a => a.id === m.userId);
                              const entregou = (task.assignees ?? []).some(
                                a => a.id === m.userId && a.done,
                              );
                              return (
                                <button
                                  key={m.userId}
                                  type="button"
                                  disabled={assigning === task.id}
                                  onClick={() => toggleAssignee(task, m.userId)}
                                  title={`${m.name}${entregou ? ' — já entregou' : ''}`}
                                  aria-pressed={marcado}
                                  className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-[11px] font-bold transition-colors disabled:opacity-50 ${
                                    entregou
                                      ? 'bg-success text-white'
                                      : marcado
                                      ? 'bg-primary-vibrant text-white'
                                      : 'border border-border text-text-secondary hover:border-primary-vibrant/50'
                                  }`}
                                >
                                  {initialsOf(m.name)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {!tasksLoading && projects.length > 0 && tasks.length === 0 && (
            <div className="flex flex-col items-center text-center gap-1 py-2 text-text-secondary">
              <FolderOpen size={24} className="text-text-soft" />
              <p className="text-xs">Crie tarefas nos projetos da equipe para atribuí-las aqui.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!transferring}
        title="Tornar dono da equipe?"
        message={`${transferring?.name ?? ''} passa a ser o dono de "${team.name}".`}
        hint={
          <>
            Você vira membro comum e perde a administração da equipe — não poderá mais convidar,
            remover pessoas nem excluir a equipe. Continua como gerente de tarefas.
            <span className="block mt-2">Só o novo dono poderá devolver a posse.</span>
          </>
        }
        confirmLabel="Transferir posse"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<Crown size={22} />}
        onConfirm={confirmTransfer}
        onClose={() => setTransferring(null)}
      />

      <ConfirmDialog
        isOpen={!!removing}
        title="Remover membro?"
        message={`${removing?.name ?? ''} deixará de fazer parte de "${team.name}" e perderá acesso aos projetos da equipe.`}
        hint={
          <>
            O que essa pessoa criou na equipe continua aqui e passa a ser seu. Tarefas atribuídas a
            ela ficam sem responsável.
          </>
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Excluir equipe?"
        message={`A equipe "${team.name}" será apagada para todos os membros. Esta ação não pode ser desfeita.`}
        hint={
          <>
            <strong className="block text-text-primary mb-1">Também serão apagados</strong>
            {projects.length > 0 ? (
              <>
                {projects.length} projeto{projects.length > 1 ? 's' : ''} da equipe e{' '}
                {totalTasks} tarefa{totalTasks === 1 ? '' : 's'}. Ninguém vai conseguir recuperar.
              </>
            ) : (
              <>A equipe ainda não tem projetos — nada de trabalho será perdido.</>
            )}
            <strong className="block text-text-primary mt-3 mb-1">Só quer sair?</strong>
            Transfira a posse na aba Membros e depois saia da equipe. O time continua com tudo.
          </>
        }
        confirmLabel="Excluir equipe"
        cancelLabel="Cancelar"
        tone="danger"
        icon={<AlertTriangle size={22} />}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Modal>
  );
};
