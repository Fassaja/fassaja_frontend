import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Dropdown } from '@/components/common/Dropdown';
import { TaskPriority } from '@/types/task';
import { Project } from '@/types/project';
import { Tag } from '@/types/tag';
import { tint, chipText } from '@/utils/color';
import { SEM_PROJETO, TODOS_PROJETOS } from '@/utils/taskFilters';

const priorityOptions = [
  { value: 'all', label: 'Todas as prioridades' },
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

/**
 * Busca da barra de ferramentas.
 *
 * Não usa o <Input> comum de propósito: aquele tem altura própria (py-2.5, uns
 * 42px) e um invólucro `w-full`, e aqui o campo divide uma linha com controles
 * de h-10. Ficariam desalinhados por 2px — o suficiente para a barra parecer
 * torta.
 */
export const TaskSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <div className="relative min-w-[160px] flex-1">
    <Search
      size={16}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-soft"
    />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Buscar tarefa..."
      aria-label="Buscar tarefa pelo título"
      className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-8 text-sm text-text-primary placeholder-text-soft transition-shadow focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60 [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Limpar busca"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-soft transition-colors hover:text-text-primary"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

const PANEL_W = 280;
const PANEL_H = 340; // estimativa para decidir se abre para cima

interface TaskFilterMenuProps {
  filterPriority: TaskPriority | 'all';
  onPriorityChange: (value: TaskPriority | 'all') => void;
  filterProject: string | 'all';
  onProjectChange: (value: string | 'all') => void;
  projects: Project[];
  tags: Tag[];
  filterTags: string[];
  onToggleTag: (id: string) => void;
  /** Quantos filtros estão ativos — vira o badge no botão. */
  activeCount: number;
  onReset: () => void;
}

/**
 * Projeto, prioridade e tags dentro de um painel.
 *
 * Antes os três ficavam sempre à mostra dentro de um <Card>, com borda e sombra
 * iguais às dos cards de tarefa: o cromo tinha o mesmo peso do conteúdo, e a
 * linha de tags crescia sem limite conforme a pessoa criava tags.
 *
 * Guardar filtro atrás de um botão tem um risco conhecido — a pessoa esquece
 * que filtrou e acha que perdeu tarefas. Por isso o badge de contagem no
 * gatilho e a fila de <ActiveFilterChips> logo abaixo da barra: o que está
 * ativo continua VISÍVEL, só deixou de ocupar a tela quando não há nada ativo.
 */
export const TaskFilterMenu: React.FC<TaskFilterMenuProps> = ({
  filterPriority,
  onPriorityChange,
  filterProject,
  onProjectChange,
  projects,
  tags,
  filterTags,
  onToggleTag,
  activeCount,
  onReset,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const projectOptions = [
    { value: TODOS_PROJETOS, label: 'Todos os projetos' },
    // Logo depois de "todos", antes da lista: é o recorte padrão da tela, e
    // enterrá-lo no fim de vinte projetos o esconderia de quem mais o usa.
    { value: SEM_PROJETO, label: 'Sem projeto' },
    ...projects.map(p => ({ value: p.id, label: p.name })),
  ];

  // Painel via portal com posição fixa: alinhado pela borda DIREITA do botão
  // (ele fica no fim da barra) e preso dentro da viewport.
  const posicionar = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    /* Altura REAL do painel quando ele já está montado; a constante é só o
       palpite da primeira abertura. Ela varia bastante — sem tags o painel tem
       ~210px, com a lista de tags cheia passa de 370 —, então decidir o lado
       por um número fixo abria para baixo painéis que não cabiam. */
    const altura = panelRef.current?.offsetHeight || PANEL_H;
    const abrirParaCima = r.bottom + altura > window.innerHeight && r.top > altura;
    setPos({
      top: abrirParaCima ? Math.max(8, r.top - altura - 8) : r.bottom + 8,
      left: Math.max(8, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - 8)),
    });
  }, []);

  const openPanel = () => {
    posicionar();
    setOpen(true);
  };

  /**
   * Reposiciona enquanto aberto.
   *
   * O painel é `fixed` e o botão rola junto com a página: sem isto, rolar
   * qualquer pixel deixa o painel parado no ar, descolado do gatilho. Mesmo
   * tratamento que o Dropdown e o menu de status já fazem.
   *
   * `capture: true` no scroll porque o evento não borbulha: quem rola pode ser
   * um container interno, e sem a fase de captura o listener no window nunca
   * seria chamado.
   */
  useLayoutEffect(() => {
    if (!open) return;
    // Recoloca já montado, agora medindo a altura real. useLayoutEffect e não
    // useEffect: o comum roda depois do paint, e o painel apareceria por um
    // quadro na posição do palpite antes de saltar para a certa.
    posicionar();
    const aoMover = () => posicionar();
    window.addEventListener('scroll', aoMover, true);
    window.addEventListener('resize', aoMover);
    return () => {
      window.removeEventListener('scroll', aoMover, true);
      window.removeEventListener('resize', aoMover);
    };
  }, [open, posicionar]);

  // Fecha ao clicar fora ou com Esc. O clique de fora não pode usar overlay
  // fixo aqui: os <Dropdown> de dentro do painel abrem os próprios menus em
  // portal, e um overlay comeria o clique deles.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      // Menu de um Dropdown interno (vive no body, fora do painel).
      if ((t as HTMLElement).closest?.('[role="listbox"]')) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition-all active:scale-95 ${
          activeCount > 0 || open
            ? 'border-primary-vibrant/40 bg-primary-light text-primary-vibrant'
            : 'border-border bg-surface text-text-secondary hover:border-primary-vibrant/40 hover:text-text-primary'
        }`}
      >
        <SlidersHorizontal size={16} />
        <span className="hidden sm:inline">Filtros</span>
        {activeCount > 0 && (
          <span className="min-w-[18px] rounded-full bg-primary-vibrant px-1 text-center text-[11px] font-bold leading-[18px] text-white">
            {activeCount}
          </span>
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Filtros de tarefas"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
              style={{ position: 'fixed', top: pos.top, left: pos.left, width: PANEL_W }}
              className="z-[80] space-y-3 rounded-2xl border-2 border-border bg-surface p-3 shadow-xl ring-1 ring-primary-vibrant/20"
            >
              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-secondary">Projeto</p>
                <Dropdown
                  options={projectOptions}
                  value={filterProject}
                  onChange={onProjectChange}
                  size="sm"
                  fullWidth
                />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-semibold text-text-secondary">Prioridade</p>
                <Dropdown
                  options={priorityOptions}
                  value={filterPriority}
                  onChange={v => onPriorityChange(v as TaskPriority | 'all')}
                  size="sm"
                  fullWidth
                />
              </div>

              {tags.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-text-secondary">Tags</p>
                  {/* Rola em vez de esticar: com muitas tags o painel passaria
                      da altura da tela e o "Limpar" sairia de vista. */}
                  <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {tags.map(tag => {
                      const active = filterTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => onToggleTag(tag.id)}
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-all active:scale-95 ${
                            active
                              ? 'border-transparent text-white'
                              : 'border-border text-text-secondary hover:border-text-soft'
                          }`}
                          style={
                            active
                              ? { backgroundColor: tag.color }
                              : { backgroundColor: tint(tag.color) }
                          }
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: active ? '#fff' : tag.color }}
                          />
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <X size={15} /> Limpar filtros
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

interface ActiveFilterChipsProps {
  filterPriority: TaskPriority | 'all';
  onPriorityChange: (value: TaskPriority | 'all') => void;
  filterProject: string | 'all';
  onProjectChange: (value: string | 'all') => void;
  projects: Project[];
  tags: Tag[];
  filterTags: string[];
  onToggleTag: (id: string) => void;
}

/**
 * O que está filtrado agora, um chip por filtro, cada um dispensável no X.
 *
 * É a contrapartida de esconder os controles no painel: sem esta fila, filtrar
 * por um projeto e voltar à página no dia seguinte pareceria perda de tarefas.
 * Só existe quando há algo ativo — sem filtro, não ocupa uma linha sequer.
 */
export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filterPriority,
  onPriorityChange,
  filterProject,
  onProjectChange,
  projects,
  tags,
  filterTags,
  onToggleTag,
}) => {
  const project = projects.find(p => p.id === filterProject);
  const semProjeto = filterProject === SEM_PROJETO;
  const activeTags = tags.filter(t => filterTags.includes(t.id));

  if (filterProject === TODOS_PROJETOS && filterPriority === 'all' && activeTags.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      {project && (
        <Chip
          label={project.name}
          color={project.color}
          onRemove={() => onProjectChange(TODOS_PROJETOS)}
        />
      )}
      {/* Sem cor: "sem projeto" não É um projeto, e pintá-lo como se fosse o
          faria parecer mais um da lista. */}
      {semProjeto && (
        <Chip label="Sem projeto" onRemove={() => onProjectChange(TODOS_PROJETOS)} />
      )}
      {filterPriority !== 'all' && (
        <Chip
          label={`Prioridade: ${PRIORITY_LABEL[filterPriority]}`}
          onRemove={() => onPriorityChange('all')}
        />
      )}
      {activeTags.map(tag => (
        <Chip key={tag.id} label={tag.name} color={tag.color} onRemove={() => onToggleTag(tag.id)} />
      ))}
    </div>
  );
};

const Chip: React.FC<{ label: string; color?: string; onRemove: () => void }> = ({
  label,
  color,
  onRemove,
}) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-border py-1 pl-2.5 pr-1 text-[12px] font-semibold text-text-primary"
    style={color ? { backgroundColor: tint(color), color: chipText(color) } : undefined}
  >
    {color && (
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    )}
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remover filtro ${label}`}
      className="rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
    >
      <X size={12} />
    </button>
  </span>
);
