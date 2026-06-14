import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { OptionSelector, SelectableOption } from '@/components/common/OptionSelector';
import { DatePicker } from '@/components/common/DatePicker';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { Project } from '@/types/project';
import { projectsService } from '@/services/projectsService';

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
  { value: 'in_progress', label: 'Em Progresso', color: '#2477FF' },
  { value: 'completed', label: 'Concluída', color: '#22C55E' },
];

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdateTask,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    projectId: '',
    dueDate: '',
  });

  useEffect(() => {
    projectsService.getProjects().then(setProjects);
  }, []);

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
      setError('');
    }
  }, [task, isOpen]);

  const set = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const projectOptions: SelectableOption[] = [
    { value: '', label: 'Sem projeto' },
    ...projects.map(p => ({ value: p.id, label: p.name, color: p.color, dot: true })),
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
      });
      onClose();
    } catch (err) {
      setError('Não foi possível salvar as alterações. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Tarefa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Título"
          name="title"
          placeholder="Digite o título da tarefa"
          value={formData.title}
          onChange={e => {
            set('title', e.target.value);
            if (error) setError('');
          }}
          error={error && !formData.title.trim() ? error : undefined}
          disabled={loading}
          autoFocus
        />

        <Textarea
          label="Descrição"
          name="description"
          placeholder="Detalhes da tarefa (opcional)"
          value={formData.description}
          onChange={e => set('description', e.target.value)}
          disabled={loading}
          rows={3}
        />

        <OptionSelector
          label="Prioridade"
          options={priorityOptions}
          value={formData.priority}
          onChange={v => set('priority', v as TaskPriority)}
          layout="grid"
          columns={3}
        />

        <OptionSelector
          label="Status"
          options={statusOptions}
          value={formData.status}
          onChange={v => set('status', v as TaskStatus)}
          layout="grid"
          columns={3}
        />

        <OptionSelector
          label="Projeto"
          options={projectOptions}
          value={formData.projectId}
          onChange={v => set('projectId', v)}
        />

        <DatePicker
          label="Data de vencimento"
          value={formData.dueDate}
          onChange={v => set('dueDate', v)}
          disabled={loading}
          openUp
        />

        {error && formData.title.trim() && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="flex-1 rounded-xl"
          >
            Salvar alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
};
