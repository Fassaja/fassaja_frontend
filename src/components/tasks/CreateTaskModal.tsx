import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { MoreOptions } from '@/components/common/MoreOptions';
import { Button } from '@/components/common/Button';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { Dropdown } from '@/components/common/Dropdown';
import { AssigneeSelector } from './AssigneeSelector';
import { DatePicker } from '@/components/common/DatePicker';
import { TagSelector } from './TagSelector';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { TeamMember } from '@/types/team';
import { useProjects } from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
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

const emptyForm = {
  title: '',
  description: '',
  priority: 'medium' as TaskPriority,
  status: 'pending' as TaskStatus,
  projectId: '',
  dueDate: '',
};

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onCreateTask,
}) => {
  const { projects } = useProjects();
  const { assignTask } = useTasks();
  const { account, isGuest } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

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
      setAssigneeIds([]);
    }
  }, [teamProject?.teamId]);

  const projectOptions: SelectableOption[] = [
    { value: '', label: 'Sem projeto' },
    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color, dot: true })),
  ];


  // Em projeto de equipe, só o dono ou um "gerente de tarefas" pode criar.
  // A lista de membros (já carregada) traz canManageTasks (true para o dono).
  const myMembership = members.find(m => m.userId === account?.id);
  const blockedByPermission =
    !!teamProject && members.length > 0 && !myMembership?.canManageTasks;

  const handleClose = () => {
    setError('');
    setTagIds([]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Dê um título para a tarefa antes de continuar.');
      return;
    }
    if (blockedByPermission) {
      setError('Você não tem permissão para criar tarefas neste projeto de equipe.');
      return;
    }

    try {
      setLoading(true);
      const created = await onCreateTask({
        title: formData.title.trim(),
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || undefined,
        dueDate: formData.dueDate || undefined,
        tagIds: tagIds.length ? tagIds : undefined,
      });
      // Em projeto de equipe, já nasce com os responsáveis escolhidos.
      if (teamProject && assigneeIds.length && account) {
        await assignTask(created.id, assigneeIds);
      }
      setFormData(emptyForm);
      setAssigneeIds([]);
      setTagIds([]);
      setError('');
      toast.success('Tarefa criada.');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível criar a tarefa. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Quantos ajustes escondidos já estão definidos. Sem esse aviso, quem abriu
  // "mais opções", escolheu um responsável e recolheu de volta salvaria sem
  // lembrar do que tinha marcado.
  const ajustesDefinidos =
    (formData.status !== 'pending' ? 1 : 0) + (assigneeIds.length ? 1 : 0) + tagIds.length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Nova tarefa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* O título e a descrição formam UM bloco de escrita, sem rótulos e
            sem molduras: é onde o cursor já está quando o modal abre, e
            digitar + Enter basta para criar a tarefa. Todo o resto tem
            padrão razoável e pode ficar como está. */}
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

        {/* A linha de decisões rápidas: quando, quanto importa, onde. São as
            três que a pessoa realmente responde ao criar — como controles do
            tamanho da resposta, não como três campos de formulário. */}
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

        {blockedByPermission && (
          <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2">
            Você não pode criar tarefas neste projeto de equipe. Peça ao dono para te tornar
            <span className="font-semibold"> gerente de tarefas</span>.
          </p>
        )}

        <MoreOptions activeCount={ajustesDefinidos}>
          <OptionSelector
            label="Começar como"
            options={statusOptions}
            value={formData.status}
            onChange={v => set('status', v as TaskStatus)}
            layout="grid"
            columns={3}
            disabled={loading}
          />

          {teamProject && !blockedByPermission && (
            <AssigneeSelector
              members={members}
              value={assigneeIds}
              onChange={setAssigneeIds}
              disabled={loading}
            />
          )}

          {!isGuest && <TagSelector value={tagIds} onChange={setTagIds} disabled={loading} />}
        </MoreOptions>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        {/* sticky: em janela baixa o modal rola, e sem isto os botões ficam
            abaixo da dobra — a pessoa escreve tudo e não acha como salvar. */}
        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            disabled={blockedByPermission}
          >
            Criar tarefa
          </Button>
        </div>
      </form>
    </Modal>
  );
};
