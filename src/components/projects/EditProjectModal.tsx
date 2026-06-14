import React, { useEffect, useState } from 'react';
import { Check, FolderOpen } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Project } from '@/types/project';

interface EditProjectModalProps {
  isOpen: boolean;
  project?: Project;
  onClose: () => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<Project | undefined>;
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

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  project,
  onClose,
  onUpdateProject,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', description: '', color: colorOptions[0] });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        color: project.color,
      });
      setError('');
    }
  }, [project, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Dê um nome ao projeto antes de continuar.');
      return;
    }
    if (!project) return;

    try {
      setLoading(true);
      await onUpdateProject(project.id, {
        name: formData.name.trim(),
        description: formData.description || undefined,
        color: formData.color,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Projeto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: formData.color + '1A', color: formData.color }}
          >
            <FolderOpen size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-text-primary truncate">
              {formData.name.trim() || 'Nome do projeto'}
            </p>
            <p className="text-xs text-text-secondary truncate">
              {formData.description || 'Pré-visualização do projeto'}
            </p>
          </div>
        </div>

        <Input
          label="Nome do projeto"
          name="name"
          placeholder="Ex.: Marketing"
          value={formData.name}
          onChange={handleChange}
          error={error && !formData.name.trim() ? error : undefined}
          disabled={loading}
          autoFocus
        />

        <Textarea
          label="Descrição"
          name="description"
          placeholder="Para que serve este projeto? (opcional)"
          value={formData.description}
          onChange={handleChange}
          disabled={loading}
          rows={3}
        />

        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Cor</label>
          <div className="flex gap-2.5 flex-wrap">
            {colorOptions.map(color => {
              const selected = formData.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color}`}
                  aria-pressed={selected}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform ${
                    selected ? 'ring-2 ring-offset-2 ring-offset-white scale-105' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color, ...(selected ? { '--tw-ring-color': color } as React.CSSProperties : {}) }}
                >
                  {selected && <Check size={18} strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {error && formData.name.trim() && (
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
