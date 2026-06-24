import React, { useEffect, useRef, useState } from 'react';
import { Plus, Tag as TagIcon, X } from 'lucide-react';
import { useTags } from '@/contexts/TagsContext';
import { useToast } from '@/contexts/ToastContext';

interface TagSelectorProps {
  /** IDs das tags selecionadas. */
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

// Paleta usada ao criar uma tag nova (mesma do projeto), cicla conforme cresce.
const TAG_COLORS = [
  '#2477FF',
  '#8B5CF6',
  '#22C55E',
  '#F43F5E',
  '#FBBF24',
  '#EC4899',
  '#06B6D4',
  '#14B8A6',
];

export const TagSelector: React.FC<TagSelectorProps> = ({ value, onChange, disabled }) => {
  const { tags, createTag } = useTags();
  const toast = useToast();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected = value
    .map(id => tags.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const q = query.trim();
  const matches = tags.filter(
    t => !value.includes(t.id) && t.name.toLowerCase().includes(q.toLowerCase()),
  );
  const exactMatch = tags.find(t => t.name.toLowerCase() === q.toLowerCase());
  const canCreate = q.length > 0 && !exactMatch;

  const add = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery('');
  };

  const remove = (id: string) => onChange(value.filter(v => v !== id));

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      const color = TAG_COLORS[tags.length % TAG_COLORS.length];
      const created = await createTag({ name: q, color });
      onChange([...value, created.id]);
      setQuery('');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível criar a tag.');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (exactMatch && !value.includes(exactMatch.id)) add(exactMatch.id);
      else if (canCreate) handleCreate();
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-medium text-text-primary mb-2">Tags</label>

      {/* Campo com chips selecionados + input */}
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[44px] w-full rounded-xl border border-border bg-white px-2.5 py-1.5 transition-colors focus-within:border-text-soft ${
          disabled ? 'opacity-60 pointer-events-none' : ''
        }`}
        onClick={() => setOpen(true)}
      >
        {selected.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 text-[12px] font-semibold pl-2 pr-1 py-0.5 rounded-full"
            style={{ backgroundColor: tag.color + '1A', color: tag.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
            {tag.name}
            <button
              type="button"
              aria-label={`Remover ${tag.name}`}
              onClick={e => {
                e.stopPropagation();
                remove(tag.id);
              }}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length ? 'Adicionar…' : 'Buscar ou criar tag…'}
          className="flex-1 min-w-[120px] bg-transparent focus:outline-none focus-visible:outline-none text-sm text-text-primary placeholder:text-text-soft py-0.5"
        />
      </div>

      {/* Lista de sugestões */}
      {open && (matches.length > 0 || canCreate) && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-white shadow-xl max-h-56 overflow-y-auto py-1">
          {matches.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => add(tag.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-left truncate">{tag.name}</span>
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-primary-vibrant hover:bg-bg-secondary transition-colors disabled:opacity-60"
            >
              <Plus size={15} className="shrink-0" />
              <span className="flex-1 text-left truncate">Criar tag "{q}"</span>
            </button>
          )}
        </div>
      )}

      {/* Dica quando ainda não há nenhuma tag */}
      {open && tags.length === 0 && !q && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-white shadow-xl px-3 py-2.5 flex items-center gap-2 text-sm text-text-secondary">
          <TagIcon size={15} className="text-text-soft shrink-0" />
          Digite um nome para criar sua primeira tag.
        </div>
      )}
    </div>
  );
};
