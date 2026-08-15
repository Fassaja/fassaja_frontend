import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { MoreOptions } from '@/components/common/MoreOptions';
import { Button } from '@/components/common/Button';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { Dropdown } from '@/components/common/Dropdown';
import { DatePicker } from '@/components/common/DatePicker';
import { TagSelector } from './TagSelector';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TeamMember } from '@/types/team';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';

interface EditTaskModalProps {
  isOpen: boolean;
  task?: Task;
  onClose: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>;
}

const priorityOptions: SelectableOption[] = [
  { value: 'low', label: 'Baixa', color: '#22C55E', dot: true },
  { value: 'medium', label: 'Média', color: '#FBBF24', dot: true },
  { value: 'high', label: 'Alta', color: '#8B5CF6', dot: true },
];

const statusOptions: SelectableOption[] = [
  { value: 'pending', label: 'Pendente', color: '#64748B' },
  { value: 'in_progress', label: 'Em progresso', color: '#2477FF' },
  { value: 'completed', label: 'Concluída', color: '#22C55E' },
];

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdateTask,
}) => {
  const { projects } = useProjects();
  const { assignTask } = useTasks();
  const { account, isGuest } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    projectId: '',
    dueDate: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status === 'overdue' ? 'pending' : task.status,
        projectId: task.projectId || '',
        dueDate: task.dueDate || '',
      });
      setAssigneeId(task.assigneeId || '');
      setTagIds((task.tags ?? []).map(t => t.id));
      setError('');
    }
  }, [task, isOpen]);

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const selectedProject = projects.find(p => p.id === formData.projectId);
  const teamProject =
    selectedProject && selectedProject.type === 'team' && selectedProject.teamId
      ? selectedProject
      : null;

  useEffect(() => {
    if (teamProject?.teamId) {
      teamsService.getMembers(teamProject.teamId).then(setMembers).catch(() => setMembers([]));
    } else {
      setMembers([]);
    }
  }, [teamProject?.teamId]);

  const projectOptions: SelectableOption[] = [
    { value: '', label: 'Sem projeto' },
    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color, dot: true })),
  ];

  const memberOptions = [
    { value: '', label: 'Ninguém (sem responsável)' },
    ...members.map(m => ({ value: m.userId, label: m.role === 'owner' ? `${m.name} (dono)` : m.name })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Dê um título para a tarefa antes de continuar.');
      return;
    }
    if (!task) return;

    try {
      setLoading(true);
      await onUpdateTask(task.id, {
        title: formData.title.trim(),
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || undefined,
        dueDate: formData.dueDate || undefined,
        // Sempre envia (mesmo []) para o backend substituir o conjunto de tags.
        ...(isGuest ? {} : { tagIds }),
      });
      // Reconcilia a atribuição se mudou (em projeto de equipe).
      const currentAssignee = task.assigneeId || '';
      if (teamProject && assigneeId !== currentAssignee && account) {
        await assignTask(task.id, assigneeId || null);
      } else if (!teamProject && currentAssignee) {
        // Saiu de um projeto de equipe: remove a atribuição.
        await assignTask(task.id, null);
      }
      toast.success('Alterações salvas.');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar as alterações. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // O que está definido atrás do "mais opções" — decide o contador e, na
  // edição, se o bloco já nasce aberto.
  const ajustesDefinidos =
    (formData.status !== 'pending' ? 1 : 0) + (assigneeId ? 1 : 0) + tagIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar tarefa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mesma estrutura da criação, de propósito: editar e criar são a mesma
            tarefa vista duas vezes, e dar duas caras a ela é o que fazia a
            edição parecer outro produto. */}
        <div>
          <HeadlineInput
            name="title"
            aria-label="Título da tarefa"
            placeholder="O que precisa ser feito?"
            value={formData.title}
            onChange={e => {
              set('title', e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
            maxLength={200}
            autoFocus
          />
          <NoteField
            name="description"
            aria-label="Descrição da tarefa"
            className="mt-2"
            placeholder="Adicionar detalhes…"
            value={formData.description}
            onChange={e => set('description', e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
          <DatePicker
            value={formData.dueDate}
            onChange={v => set('dueDate', v)}
            placeholder="Sem data"
            disabled={loading}
            size="sm"
          />
          <OptionSelector
            options={priorityOptions}
            value={formData.priority}
            onChange={v => set('priority', v as TaskPriority)}
            disabled={loading}
            size="sm"
          />
          <Dropdown
            options={projectOptions}
            value={formData.projectId}
            onChange={v => set('projectId', v)}
            placeholder="Sem projeto"
            size="sm"
            disabled={loading}
          />
        </div>

        {/* Na edição o bloco abre sozinho quando já há algo definido lá dentro:
            esconder um responsável ou uma tag que a pessoa mesma escolheu
            pareceria que a tarefa os perdeu. */}
        <MoreOptions
          key={task?.id}
          activeCount={ajustesDefinidos}
          defaultOpen={ajustesDefinidos > 0}
        >
          <OptionSelector
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={v => set('status', v as TaskStatus)}
            layout="grid"
            columns={3}
            disabled={loading}
          />

          {teamProject && (
            <Dropdown
              label="Propor a alguém da equipe"
              options={memberOptions}
              value={assigneeId}
              onChange={setAssigneeId}
              fullWidth
            />
          )}

          {!isGuest && <TagSelector value={tagIds} onChange={setTagIds} disabled={loading} />}
        </MoreOptions>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Salvar alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
};
