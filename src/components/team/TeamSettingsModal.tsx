import React, { useEffect, useMemo, useState } from 'react';
import {
  Settings2,
  Users,
  ListTodo,
  Crown,
  Trash2,
  VolumeX,
  Volume2,
  Check,
  AlertTriangle,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
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

const ASSIGNMENT_HINT: Record<string, string> = {
  pending: 'Aguardando aceite',
  accepted: 'Aceita',
  rejected: 'Recusada',
};

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

  const memberOptions = useMemo(
    () => [
      { value: '', label: 'Sem responsável' },
      ...members.map(m => ({ value: m.userId, label: m.name })),
    ],
    [members],
  );

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

  const toggleMute = async (m: TeamMember) => {
    setBusyMember(m.userId);
    try {
      await teamsService.setMemberMute(team.id, m.userId, !m.muted);
      toast.success(m.muted ? `${m.name} pode falar no chat.` : `${m.name} foi silenciado no chat.`);
      onChanged();
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível atualizar.');
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

  const reassign = async (task: Task, assigneeId: string) => {
    setAssigning(task.id);
    try {
      const updated = await tasksService.assignTask(task.id, assigneeId || null);
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
                ? 'bg-white text-primary-vibrant shadow-sm'
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
          <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
            <p className="text-sm font-bold text-text-primary flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" /> Zona de perigo
            </p>
            <p className="text-xs text-text-secondary mt-1 mb-3">
              Excluir a equipe remove os membros, o histórico do chat e os convites. Os projetos
              ficam sem equipe, mas não são apagados. Esta ação não pode ser desfeita.
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
                    {isOwner && <Crown size={14} className="text-amber-500 shrink-0" />}
                    {m.muted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-danger">
                        <VolumeX size={11} /> Silenciado
                      </span>
                    )}
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
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
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
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleMute(m)}
                      disabled={busy}
                      aria-label={m.muted ? 'Reativar no chat' : 'Silenciar no chat'}
                      title={m.muted ? 'Reativar no chat' : 'Silenciar no chat'}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        m.muted
                          ? 'text-amber-600 hover:bg-amber-50'
                          : 'text-text-secondary hover:bg-bg-secondary'
                      }`}
                    >
                      {m.muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>
                    <button
                      onClick={() => setRemoving(m)}
                      disabled={busy}
                      aria-label="Remover membro"
                      title="Remover da equipe"
                      className="p-2 rounded-lg text-danger hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
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
                            {task.assigneeId && task.assignmentStatus && (
                              <p className="text-[11px] text-text-secondary">
                                {ASSIGNMENT_HINT[task.assignmentStatus] ?? ''}
                              </p>
                            )}
                          </div>
                          <Dropdown
                            size="sm"
                            menuAlign="right"
                            value={task.assigneeId ?? ''}
                            options={memberOptions}
                            onChange={v => reassign(task, v)}
                            placeholder="Atribuir"
                            disabled={assigning === task.id}
                          />
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
        isOpen={!!removing}
        title="Remover membro?"
        message={`${removing?.name ?? ''} deixará de fazer parte de "${team.name}".`}
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
        message={`A equipe "${team.name}" e todo o histórico do chat serão apagados. Os projetos ficarão sem equipe. Esta ação não pode ser desfeita.`}
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
