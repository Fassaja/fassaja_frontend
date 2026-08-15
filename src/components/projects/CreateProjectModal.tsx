import React, { useEffect, useState } from 'react';
import { Check, FolderOpen, User, Users } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { Button } from '@/components/common/Button';
import { OptionSelector } from '@/components/common/OptionSelector';
import { Dropdown } from '@/components/common/Dropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';
import { TeamSummary } from '@/types/team';
import { Project } from '@/types/project';
import { tint, chipText } from '@/utils/color';

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
  const { account } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: colorOptions[0],
    type: 'solo' as 'solo' | 'team',
    teamId: '',
  });

  useEffect(() => {
    if (isOpen && account) {
      teamsService.listTeams().then(setTeams).catch(() => setTeams([]));
    }
  }, [isOpen, account]);

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
    if (formData.type === 'team' && !formData.teamId) {
      setError('Selecione a equipe do projeto.');
      return;
    }

    try {
      setLoading(true);
      await onCreateProject({
        name: formData.name.trim(),
        description: formData.description || undefined,
        color: formData.color,
        type: formData.type,
        teamId: formData.type === 'team' ? formData.teamId : undefined,
      });
      setFormData({ name: '', description: '', color: colorOptions[0], type: 'solo', teamId: '' });
      setError('');
      toast.success('Projeto criado.');
      onClose();
    } catch (err) {
      setError('Não foi possível criar o projeto. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo projeto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Live preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: tint(formData.color), color: chipText(formData.color) }}
          >
            <FolderOpen size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-text-primary truncate">
              {formData.name.trim() || 'Nome do projeto'}
            </p>
            <p className="text-xs text-text-secondary truncate flex items-center gap-1.5">
              {formData.type === 'team' ? <Users size={12} /> : <User size={12} />}
              {formData.type === 'team'
                ? teams.find(t => t.id === formData.teamId)?.name ?? 'Projeto de equipe'
                : 'Projeto solo'}
            </p>
          </div>
        </div>

        {/* O nome do projeto é o projeto. O cartão acima já mostra o resultado
            enquanto se digita — um rótulo "Nome do projeto" seria a terceira
            vez que a mesma tela diz a mesma coisa. */}
        <div>
          <HeadlineInput
            name="name"
            aria-label="Nome do projeto"
            placeholder="Como se chama o projeto?"
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            maxLength={120}
            autoFocus
          />
          <NoteField
            name="description"
            aria-label="Descrição do projeto"
            className="mt-2"
            placeholder="Para que serve este projeto?"
            value={formData.description}
            onChange={handleChange}
            disabled={loading}
          />
        </div>

        {/* Solo/equipe e a escolha da equipe na mesma linha: é uma decisão só,
            e separá-las em dois campos fazia a segunda parecer desligada. */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border">
          <OptionSelector
            options={[
              { value: 'solo', label: 'Solo' },
              { value: 'team', label: 'Equipe' },
            ]}
            value={formData.type}
            onChange={v => setFormData(prev => ({ ...prev, type: v as 'solo' | 'team' }))}
            disabled={loading}
            size="sm"
          />

          {formData.type === 'team' && teams.length > 0 && (
            <Dropdown
              options={teams.map(t => ({ value: t.id, label: t.name }))}
              value={formData.teamId}
              onChange={v => {
                setFormData(prev => ({ ...prev, teamId: v }));
                if (error) setError('');
              }}
              placeholder="Escolher equipe"
              size="sm"
              disabled={loading}
            />
          )}
        </div>

        {formData.type === 'team' && teams.length === 0 && (
          <p className="text-sm text-text-secondary bg-bg-secondary rounded-xl p-3">
            Você ainda não tem equipes. Crie uma na aba <span className="font-semibold">Equipe</span> para
            usar projetos de equipe.
          </p>
        )}

        {/* A cor fica à vista, e não atrás de "mais opções", porque o cartão
            no topo mostra o efeito dela em tempo real — esconder o controle e
            deixar o resultado seria só um mistério. Bolinhas menores: é
            escolha de identidade, não campo obrigatório. */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Cor do projeto">
          {colorOptions.map(color => {
            const selected = formData.color === color;
            return (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                aria-pressed={selected}
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white transition-transform ${
                  selected ? 'ring-2 ring-offset-2 ring-offset-surface scale-105' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color, ...(selected ? { '--tw-ring-color': color } as React.CSSProperties : {}) }}
              >
                {selected && <Check size={16} strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={loading}>
            Criar projeto
          </Button>
        </div>
      </form>
    </Modal>
  );
};
