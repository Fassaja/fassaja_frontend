import React, { useEffect, useState } from 'react';
import { Check, FolderOpen, Lock, User, Users } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { OptionSelector } from '@/components/common/OptionSelector';
import { Dropdown } from '@/components/common/Dropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { teamsService } from '@/services/teamsService';
import { TeamSummary } from '@/types/team';
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
  const { account } = useAuth();
  const toast = useToast();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // O servidor barrou a edição por falta de permissão (não é o dono).
  const [forbidden, setForbidden] = useState(false);
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

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || '',
        color: project.color,
        type: project.type ?? 'solo',
        teamId: project.teamId ?? '',
      });
      setError('');
      setForbidden(false);
    }
  }, [project, isOpen]);

  // Só o dono pode editar. Quando o dono é desconhecido (dados antigos), liberamos
  // e deixamos o servidor decidir — o erro 403 é tratado no submit.
  const isOwner = !project?.ownerId || !account || project.ownerId === account.id;
  const canEdit = isOwner && !forbidden;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !canEdit) return;
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
      await onUpdateProject(project.id, {
        name: formData.name.trim(),
        description: formData.description || undefined,
        color: formData.color,
        type: formData.type,
        teamId: formData.type === 'team' ? formData.teamId : undefined,
      });
      toast.success('Alterações salvas.');
      onClose();
    } catch (err) {
      // 403: o usuário não é o dono — mostra o aviso de permissão em vez de erro genérico.
      if ((err as { status?: number }).status === 403) {
        setForbidden(true);
      } else {
        setError('Não foi possível salvar as alterações. Tente novamente.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Projeto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {!canEdit && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            <Lock size={18} className="shrink-0 mt-0.5" />
            <span>
              Apenas o dono do projeto pode alterar estas informações. Você pode visualizá-las, mas
              não tem permissão para editá-las.
            </span>
          </div>
        )}

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
            <p className="text-xs text-text-secondary truncate flex items-center gap-1.5">
              {formData.type === 'team' ? <Users size={12} /> : <User size={12} />}
              {formData.type === 'team'
                ? teams.find(t => t.id === formData.teamId)?.name ?? 'Projeto de equipe'
                : 'Projeto solo'}
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
          disabled={loading || !canEdit}
          autoFocus
        />

        <Textarea
          label="Descrição"
          name="description"
          placeholder="Para que serve este projeto? (opcional)"
          value={formData.description}
          onChange={handleChange}
          disabled={loading || !canEdit}
          rows={3}
        />

        <OptionSelector
          label="Tipo de projeto"
          options={[
            { value: 'solo', label: 'Solo' },
            { value: 'team', label: 'Equipe' },
          ]}
          value={formData.type}
          onChange={v => setFormData(prev => ({ ...prev, type: v as 'solo' | 'team' }))}
          layout="grid"
          columns={2}
          disabled={loading || !canEdit}
        />

        {formData.type === 'team' &&
          (teams.length > 0 ? (
            <Dropdown
              label="Equipe"
              options={teams.map(t => ({ value: t.id, label: t.name }))}
              value={formData.teamId}
              onChange={v => {
                setFormData(prev => ({ ...prev, teamId: v }));
                if (error) setError('');
              }}
              placeholder="Selecione a equipe"
              fullWidth
              disabled={loading || !canEdit}
            />
          ) : (
            <p className="text-sm text-text-secondary bg-bg-secondary rounded-xl p-3">
              Você ainda não tem equipes. Crie uma na aba <span className="font-semibold">Equipe</span>.
            </p>
          ))}

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
                  disabled={loading || !canEdit}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-transform disabled:cursor-not-allowed disabled:opacity-60 ${
                    selected ? 'ring-2 ring-offset-2 ring-offset-white scale-105' : 'enabled:hover:scale-105'
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
            {canEdit ? 'Cancelar' : 'Fechar'}
          </Button>
          {canEdit && (
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="flex-1 rounded-xl"
            >
              Salvar alterações
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
};
