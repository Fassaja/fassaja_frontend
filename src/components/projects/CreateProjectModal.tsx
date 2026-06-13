import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Project } from '@/types/project';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
}

const colorOptions = [
  '#2477FF',
  '#8B5CF6',
  '#22C55E',
  '#F43F5E',
  '#FBBF24',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: colorOptions[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Por favor, insira um nome para o projeto');
      return;
    }

    try {
      setLoading(true);
      await onCreateProject({
        name: formData.name,
        description: formData.description || undefined,
        color: formData.color,
      });

      setFormData({
        name: '',
        description: '',
        color: colorOptions[0],
      });

      onClose();
    } catch (error) {
      alert('Erro ao criar projeto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Projeto" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="Nome do Projeto *"
          name="name"
          placeholder="Digite o nome do projeto"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
        />

        {/* Description */}
        <Textarea
          label="Descrição"
          name="description"
          placeholder="Digite a descrição do projeto (opcional)"
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          rows={3}
        />

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Cor
          </label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-10 h-10 rounded-lg transition-all ${
                  formData.color === color
                    ? 'ring-2 ring-offset-2 ring-text-primary scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

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
            Criar Projeto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
