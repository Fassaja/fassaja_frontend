import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Textarea } from '@/components/common/Textarea';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { DatePicker } from '@/components/common/DatePicker';
import { OptionSelector } from '@/components/common/OptionSelector';
import { useToast } from '@/contexts/ToastContext';
import { useTags } from '@/contexts/TagsContext';
import { useProjects } from '@/hooks/useProjects';
import { Idea, IdeaInput, IdeaPriority, IdeaStatus } from '@/types/idea';
import { SELECTABLE_STATUS, monthOptions } from '@/utils/ideaStatus';
import { tint, chipText } from '@/utils/color';

interface EditIdeaModalProps {
  isOpen: boolean;
  idea?: Idea;
  onClose: () => void;
  onSave: (id: string, input: Partial<IdeaInput>) => Promise<Idea>;
}

const colorOptions = [
  '#2477FF', '#8B5CF6', '#22C55E', '#F43F5E',
  '#FBBF24', '#EC4899', '#06B6D4', '#14B8A6',
];

/** Separa 'AAAA-MM' de 'AAAA-MM-DD' para escolher o campo certo ao abrir. */
function splitTarget(startTarget?: string): { modo: 'nenhum' | 'mes' | 'data'; valor: string } {
  if (!startTarget) return { modo: 'nenhum', valor: '' };
  return startTarget.length === 7
    ? { modo: 'mes', valor: startTarget }
    : { modo: 'data', valor: startTarget };
}

export const EditIdeaModal: React.FC<EditIdeaModalProps> = ({ isOpen, idea, onClose, onSave }) => {
  const toast = useToast();
  const { tags } = useTags();
  const { projects } = useProjects();

  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'rascunho' as Exclude<IdeaStatus, 'convertida'>,
    priority: 'medium' as IdeaPriority,
    category: '',
    color: colorOptions[0],
    modoData: 'nenhum' as 'nenhum' | 'mes' | 'data',
    startTarget: '',
    reviewAt: '',
    dependsOnProjectId: '',
    tagIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Recarrega o formulário sempre que abre com outra ideia.
  useEffect(() => {
    if (!isOpen || !idea) return;
    const alvo = splitTarget(idea.startTarget);
    setForm({
      title: idea.title,
      description: idea.description ?? '',
      status: (idea.status === 'convertida' ? 'planejada' : idea.status) as Exclude<
        IdeaStatus,
        'convertida'
      >,
      priority: idea.priority,
      category: idea.category ?? '',
      color: idea.color,
      modoData: alvo.modo,
      startTarget: alvo.valor,
      // <input type="date"> quer 'AAAA-MM-DD'; o servidor manda ISO completo.
      reviewAt: idea.reviewAt ? idea.reviewAt.slice(0, 10) : '',
      dependsOnProjectId: idea.dependsOnProjectId ?? '',
      tagIds: idea.tags.map(t => t.id),
    });
    setError('');
  }, [isOpen, idea]);

  if (!idea) return null;

  const toggleTag = (id: string) =>
    setForm(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter(t => t !== id)
        : [...prev.tagIds, id],
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('O título é obrigatório.');
      return;
    }
    try {
      setSaving(true);
      await onSave(idea.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        category: form.category.trim() || undefined,
        color: form.color,
        startTarget: form.modoData === 'nenhum' ? undefined : form.startTarget || undefined,
        // Meio-dia local vira o instante da revisão: à meia-noite o lembrete
        // apareceria na virada do dia, quando ninguém está olhando.
        reviewAt: form.reviewAt ? new Date(`${form.reviewAt}T12:00:00`).toISOString() : undefined,
        dependsOnProjectId: form.dependsOnProjectId || null,
        tagIds: form.tagIds,
      });
      toast.success('Ideia atualizada.');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível salvar a ideia.');
    } finally {
      setSaving(false);
    }
  };

  // Projeto convertido não entra: uma ideia esperando o projeto que ela mesma
  // gerou seria uma dependência circular sem saída.
  const projetosDisponiveis = projects.filter(p => p.id !== idea.convertedProjectId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar ideia" size="lg">
      <form onSubmit={submit} className="space-y-5">
        <Input
          label="Título"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          maxLength={160}
          disabled={saving}
          error={error && !form.title.trim() ? error : undefined}
        />

        <Textarea
          label="Descrição"
          rows={4}
          maxLength={4000}
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="O que é, por que vale a pena, o que ainda falta descobrir."
          disabled={saving}
        />

        <OptionSelector
          label="Em que pé está?"
          options={SELECTABLE_STATUS.map(s => ({
            value: s.value,
            label: s.label,
            color: s.color,
            dot: true,
          }))}
          value={form.status}
          onChange={v => setForm(p => ({ ...p, status: v as typeof form.status }))}
          layout="wrap"
          disabled={saving}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OptionSelector
            label="Prioridade"
            options={[
              { value: 'low', label: 'Baixa', color: '#64748B', dot: true },
              { value: 'medium', label: 'Média', color: '#FBBF24', dot: true },
              { value: 'high', label: 'Alta', color: '#F43F5E', dot: true },
            ]}
            value={form.priority}
            onChange={v => setForm(p => ({ ...p, priority: v as IdeaPriority }))}
            layout="grid"
            columns={3}
            disabled={saving}
          />
          <Input
            label="Categoria"
            placeholder="Ex.: Pesquisa"
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            maxLength={60}
            disabled={saving}
          />
        </div>

        {/* Cor */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Cor</label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm(p => ({ ...p, color: c }))}
                aria-label={`Cor ${c}`}
                aria-pressed={form.color === c}
                className={`w-8 h-8 rounded-lg transition-transform ${
                  form.color === c ? 'ring-2 ring-offset-2 ring-primary-vibrant scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const on = form.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    aria-pressed={on}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                      on ? '' : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: tint(tag.color, 'medium'),
                      color: chipText(tag.color),
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-sm font-semibold text-text-primary mb-3">Quando começar</p>

          <OptionSelector
            options={[
              { value: 'nenhum', label: 'Sem previsão' },
              { value: 'mes', label: 'Um mês' },
              { value: 'data', label: 'Uma data' },
            ]}
            value={form.modoData}
            onChange={v =>
              setForm(p => ({ ...p, modoData: v as typeof form.modoData, startTarget: '' }))
            }
            layout="grid"
            columns={3}
            disabled={saving}
          />

          {/* Mês por Select e dia pelo DatePicker do app: <input type="month">
              não existe no Safari, e o type="date" nativo destoa do calendário
              usado no resto das telas. */}
          {form.modoData === 'mes' && (
            <div className="mt-3">
              <Select
                label="Mês"
                options={monthOptions()}
                value={form.startTarget}
                onChange={v => setForm(p => ({ ...p, startTarget: v }))}
              />
            </div>
          )}
          {form.modoData === 'data' && (
            <div className="mt-3">
              <DatePicker
                label="Data"
                value={form.startTarget}
                onChange={v => setForm(p => ({ ...p, startTarget: v }))}
                disabled={saving}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <DatePicker
              label="Lembrar de revisar em"
              value={form.reviewAt}
              onChange={v => setForm(p => ({ ...p, reviewAt: v }))}
              disabled={saving}
              openUp
            />
            <Select
              label="Só começar depois de"
              options={[
                { value: '', label: 'Nenhum projeto' },
                ...projetosDisponiveis.map(p => ({
                  value: p.id,
                  label: p.completedAt ? `${p.name} (concluído)` : p.name,
                })),
              ]}
              value={form.dependsOnProjectId}
              onChange={v => setForm(p => ({ ...p, dependsOnProjectId: v }))}
              helperText="Avisamos quando esse projeto for concluído."
            />
          </div>
        </div>

        {error && form.title.trim() && <p className="text-xs text-danger">{error}</p>}

        {/* Rodapé fixo: este formulário é longo e sem isto o "Salvar" fica
            abaixo da dobra em telas baixas. */}
        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-surface border-t border-border flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={saving}>
            Salvar ideia
          </Button>
        </div>
      </form>
    </Modal>
  );
};
