import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Select } from '@/components/common/Select';
import { Button } from '@/components/common/Button';
import { Task, TaskPriority, TaskStatus } from '@/types/task';
import { projectsService } from '@/services/projectsService';

interface EditTaskModalProps {
  isOpen: boolean;
  task?: Task;
  onClose: () => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>;
}

const priorityOptions = [
  { value: 'low', label: '🟢 Baixa' },
  { value: 'medium', label: '🟡 Média' },
  { value: 'high', label: '🔴 Alta' },
];

const statusOptions = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed', label: 'Concluída' },
  { value: 'overdue', label: 'Atrasada' },
];

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdateTask,
}) => {
  const [projects, setProjects] = React.useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'pending' as TaskStatus,
    projectId: '',
    dueDate: '',
  });

  React.useEffect(() => {
    projectsService.getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        projectId: task.projectId || '',
        dueDate: task.dueDate || '',
      });
    }
  }, [task, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Por favor, insira um título para a tarefa');
      return;
    }

    if (!task) return;

    try {
      setLoading(true);
      await onUpdateTask(task.id, {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        status: formData.status,
        projectId: formData.projectId || undefined,
        dueDate: formData.dueDate || undefined,
      });

      onClose();
    } catch (error) {
      alert('Erro ao atualizar tarefa');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Tarefa" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Título *"
          name="title"
          placeholder="Digite o título da tarefa"
          value={formData.title}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Description */}
        <Textarea
          label="Descrição"
          name="description"
          placeholder="Digite a descrição da tarefa (opcional)"
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          rows={3}
        />

        {/* Priority */}
        <Select
          label="Prioridade"
          name="priority"
          options={priorityOptions}
          value={formData.priority}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Status */}
        <Select
          label="Status"
          name="status"
          options={statusOptions}
          value={formData.status}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Project */}
        <Select
          label="Projeto"
          name="projectId"
          options={projects.map(p => ({ value: p.id, label: p.name }))}
          value={formData.projectId}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Due Date */}
        <Input
          label="Data de Vencimento"
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            className="flex-1"
          >
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Modal>
  );
};
