import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Task, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';
import { TaskCard } from './TaskCard';
import { TasksVazio } from './TasksVazio';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';
import { combinaComProjeto } from '@/utils/taskFilters';
// As colunas moram em taskColumns: o painel da Equipe monta o mesmo fluxo, e
// duas tabelas de status acabariam discordando sobre onde cada tarefa vive.
import { BOARD_COLUMNS as COLUMNS, columnOf, type ColumnKey } from '@/utils/taskColumns';
import { Stagger } from '@/components/motion';
import { SlidingHighlight } from '@/components/common/SlidingHighlight';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Abaixo do `md` do Tailwind: onde as três colunas viram uma pilha. */
const CONSULTA_CELULAR = '(max-width: 767px)';
const CHAVE_ABA = 'fassaja_aba_do_quadro';
/** Cartões desenhados por vez na coluna do celular (ver `limite`). */
const LOTE = 12;
// O id de soltar das abas leva um prefixo: a coluna aberta já usa a chave pura,
// e o dnd-kit exige ids únicos entre as zonas de soltar.
const PREFIXO_ABA = 'aba:';
// Rótulo da aba quando o da coluna não cabe em um terço de tela de 320px.
// O nome acessível continua sendo o completo (ver `aria-label` da aba).
const ROTULO_CURTO: Partial<Record<ColumnKey, string>> = { in_progress: 'Andamento' };

function abaSalva(): ColumnKey {
  try {
    const v = localStorage.getItem(CHAVE_ABA);
    if (v && COLUMNS.some(c => c.key === v)) return v as ColumnKey;
  } catch {
    /* armazenamento bloqueado: começa na primeira aba */
  }
  return COLUMNS[0].key;
}

interface TaskBoardProps {
  tasks: Task[];
  projects?: Project[];
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  searchTerm?: string;
  filterPriority?: TaskPriority | 'all';
  filterProject?: string | 'all';
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  /** Vazio de PRIMEIRO USO: não há tarefa nenhuma para mostrar. */
  onNewTask?: () => void;
  /** Vazio POR FILTRO: há tarefas, mas o recorte atual esconde todas. */
  onClearFilters?: () => void;
}

// Zona de soltar = corpo da coluna. Destaca quando há um card por cima.
const BoardColumn: React.FC<{
  col: (typeof COLUMNS)[number];
  count: number;
  children: React.ReactNode;
  /** Dentro das abas do celular: o painel é rotulado pela aba, e o cabeçalho
   *  repetiria o nome e a contagem que a aba já mostra. */
  emAba?: boolean;
}> = ({ col, count, children, emAba = false }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section
      id={emAba ? `quadro-painel-${col.key}` : undefined}
      role={emAba ? 'tabpanel' : undefined}
      aria-labelledby={emAba ? `quadro-aba-${col.key}` : undefined}
      className="flex flex-col rounded-2xl border border-border bg-bg-secondary/60 md:min-h-0 md:overflow-hidden">
      <header className={`items-center gap-2 px-4 pt-4 pb-3 shrink-0 ${emAba ? 'hidden' : 'flex'}`}>
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-text-primary">{col.label}</h3>
            <span className="text-xs font-bold text-text-secondary bg-surface rounded-full px-2 py-0.5 border border-border">
              {count}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{col.hint}</p>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-3 px-3 pb-3 rounded-b-2xl md:min-h-0 md:overflow-y-auto transition-colors ${col.tint} ${
          isOver ? 'ring-2 ring-inset ring-primary-vibrant/60' : ''
        }`}
      >
        <div className="pt-3 space-y-3 min-h-[60px]">{children}</div>
      </div>
    </section>
  );
};

/**
 * Uma aba do quadro no celular. Também é zona de soltar: com uma coluna por
 * vez na tela, arrastar um cartão até a aba de outra coluna é a forma de
 * movê-lo para lá.
 */
const AbaDoQuadro: React.FC<{
  col: (typeof COLUMNS)[number];
  count: number;
  ativa: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}> = ({ col, count, ativa, onSelect, onKeyDown, buttonRef }) => {
  const { setNodeRef, isOver } = useDroppable({ id: PREFIXO_ABA + col.key });
  return (
    <button
      ref={el => {
        setNodeRef(el);
        buttonRef(el);
      }}
      type="button"
      role="tab"
      id={`quadro-aba-${col.key}`}
      aria-selected={ativa}
      aria-controls={`quadro-painel-${col.key}`}
      aria-label={`${col.label}, ${count} ${count === 1 ? 'tarefa' : 'tarefas'}`}
      tabIndex={ativa ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      // `min-w-0`: sem ele um botão flex não encolhe abaixo do texto, e em tela
      // de 360–412px a terceira aba vazava pela borda.
      className={`relative flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg px-1 text-[13px] font-semibold leading-tight transition-colors ${
        ativa ? 'text-text-primary' : 'text-text-secondary'
      } ${isOver ? 'ring-2 ring-primary-vibrant/60' : ''}`}
    >
      {ativa && <SlidingHighlight groupId="quadro-abas" />}
      {/* Rótulo em cima, contagem embaixo: lado a lado, os três não cabiam
          em 320px sem cortar o nome. */}
      <span className="relative z-10 flex max-w-full items-center gap-1.5">
        <span className="hidden h-2 w-2 shrink-0 rounded-full min-[360px]:block" style={{ backgroundColor: col.color }} />
        <span className="truncate">{ROTULO_CURTO[col.key] ?? col.label}</span>
      </span>
      <span className="relative z-10 text-xs font-medium tabular-nums text-text-soft">{count}</span>
    </button>
  );
};

// Wrapper que torna o card arrastável (desligado no modo de seleção).
const DraggableTask: React.FC<{
  id: string;
  disabled: boolean;
  children: React.ReactNode;
}> = ({ id, disabled, children }) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`${disabled ? '' : 'cursor-grab active:cursor-grabbing'} ${
        isDragging ? 'opacity-40' : ''
      } select-none`}
    >
      {children}
    </div>
  );
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  projects = [],
  onComplete,
  onDelete,
  onEdit,
  searchTerm = '',
  filterPriority = 'all',
  filterProject = 'all',
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onNewTask,
  onClearFilters,
}) => {
  const { updateTask, completeTask } = useTasks();
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  /*
   * No celular o quadro mostra UMA coluna por vez, escolhida em abas.
   *
   * As três colunas empilhadas desenhavam todos os cartões de uma vez — com 80
   * tarefas eram mais de 3.400 elementos, cada cartão com arrastar e animação
   * próprios, e a tela travava por mais de um segundo num celular comum. Com
   * abas, só os cartões da coluna aberta existem.
   *
   * No desktop nada muda: as três colunas cabem lado a lado e rolam sozinhas.
   */
  const celular = useMediaQuery(CONSULTA_CELULAR);
  const [aba, setAba] = useState<ColumnKey>(abaSalva);
  const botoesDasAbas = useRef<(HTMLButtonElement | null)[]>([]);

  /*
   * Mesmo com uma coluna só, desenhar 40 cartões de uma vez ainda travava a
   * abertura da tela por meio segundo. No celular a coluna nasce com um lote
   * e ganha o próximo quando a rolagem chega perto do fim — bem antes de a
   * pessoa ver o fim, então ela não percebe a emenda.
   */
  const [limite, setLimite] = useState(LOTE);
  const fimDaColuna = useRef<HTMLDivElement>(null);
  // Trocar de aba ou de filtro volta ao primeiro lote.
  useEffect(() => setLimite(LOTE), [aba, searchTerm, filterPriority, filterProject]);

  const escolherAba = (key: ColumnKey) => {
    setAba(key);
    try {
      localStorage.setItem(CHAVE_ABA, key);
    } catch {
      /* sem armazenamento: só não lembra na próxima visita */
    }
  };

  // Setas e Home/End entre as abas, como pede o padrão de abas da WAI-ARIA.
  const teclaNaAba = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const ultimo = COLUMNS.length - 1;
    const alvo =
      e.key === 'ArrowRight' ? (i === ultimo ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? ultimo : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? ultimo
      : null;
    if (alvo === null) return;
    e.preventDefault();
    escolherAba(COLUMNS[alvo].key);
    botoesDasAbas.current[alvo]?.focus();
  };

  // Ponteiro: arrasta após mover 8px (tap/click continua funcionando).
  // Toque: segura 200ms para arrastar (assim a coluna ainda rola com o dedo).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const filtered = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      const matchesProject = combinaComProjeto(task, filterProject);
      return matchesSearch && matchesPriority && matchesProject;
    });
  }, [tasks, searchTerm, filterPriority, filterProject]);

  const columns = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      items: filtered.filter(t => col.statuses.includes(t.status)),
    }));
  }, [filtered]);

  const totalDaAba = columns.find(c => c.key === aba)?.items.length ?? 0;
  const temMais = celular && limite < totalDaAba;
  useEffect(() => {
    const el = fimDaColuna.current;
    if (!temMais || !el || typeof IntersectionObserver === 'undefined') {
      // Sem a API, desenha tudo: esconder tarefas nunca é a saída.
      if (temMais) setLimite(Infinity);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setLimite(l => l + LOTE);
      },
      { rootMargin: '0px 0px 800px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [temMais, limite]);

  const activeTask = activeId ? filtered.find(t => t.id === activeId) ?? null : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    const id = String(e.active.id);
    setActiveId(null);

    const task = filtered.find(t => t.id === id);
    if (!task) return;

    // Soltar numa aba (celular) vale o mesmo que soltar na coluna dela.
    const overId = e.over
      ? (String(e.over.id).replace(PREFIXO_ABA, '') as ColumnKey)
      : null;
    const from = columnOf(task.status);

    // Tarefa atrasada não muda de status arrastando (já está atrasada). Avisa
    // só quando a pessoa realmente tenta soltá-la em outra coluna; editar segue
    // liberado normalmente.
    if (task.status === 'overdue') {
      if (overId && overId !== from) {
        toast.info(
          'Tarefa atrasada não pode ser movida arrastando. Abra a tarefa e edite o status.',
        );
      }
      return;
    }

    if (!overId || from === overId) return; // fora de uma coluna ou na mesma

    const label = COLUMNS.find(c => c.key === overId)?.label ?? '';
    try {
      // Concluir passa pelo completeTask (completedAt + comemoração).
      // Concluir já mostra "Tarefa concluída · Desfazer"; um segundo aviso
      // ("Movida para Concluída") só empilharia o mesmo recado.
      if (overId === 'completed') await completeTask(id);
      else {
        await updateTask(id, { status: overId });
        toast.success(`Movida para ${label}`);
      }
    } catch {
      toast.error('Não foi possível mover a tarefa. Tente novamente.');
    }
  };

  if (filtered.length === 0) {
    return <TasksVazio total={tasks.length} onNewTask={onNewTask} onClearFilters={onClearFilters} />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* A altura desconta o que existe acima do quadro: cabeçalho da página +
          a barra de controles. Eram 16rem quando havia três faixas de cromo;
          com a barra única sobram cerca de 10,5rem, e 12rem deixa uma folga de
          propósito — errar para baixo custa um pouco de espaço morto, errar
          para cima empurra as colunas para fora da janela. */}
      {/* As três colunas entram em cascata. São fixas — quem se move são os
          cartões dentro delas, que o arrastar já anima por conta própria. */}
      {celular && (
        <div
          role="tablist"
          aria-label="Colunas do quadro"
          className="mb-3 flex gap-1 rounded-xl border border-border bg-bg-secondary p-1"
        >
          {columns.map((col, i) => (
            <AbaDoQuadro
              key={col.key}
              col={col}
              count={col.items.length}
              ativa={aba === col.key}
              onSelect={() => escolherAba(col.key)}
              onKeyDown={e => teclaNaAba(e, i)}
              buttonRef={el => {
                botoesDasAbas.current[i] = el;
              }}
            />
          ))}
        </div>
      )}

      <Stagger gap={80} className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-12rem)]">
        {(celular ? columns.filter(c => c.key === aba) : columns).map(col => (
          <BoardColumn key={col.key} col={col} count={col.items.length} emAba={celular}>
            {col.items.length > 0 ? (
              (celular ? col.items.slice(0, limite) : col.items).map(task => (
                <DraggableTask key={task.id} id={task.id} disabled={selectionMode}>
                  <TaskCard
                    task={task}
                    project={projects.find(p => p.id === task.projectId)}
                    onComplete={onComplete}
                    onDelete={onDelete}
                    onClick={onEdit}
                    selectionMode={selectionMode}
                    selected={selectedIds?.has(task.id)}
                    onToggleSelect={onToggleSelect}
                  />
                </DraggableTask>
              ))
            ) : (
              <p className="text-center text-xs text-text-soft py-8 px-2">
                Nada por aqui ainda.
                <br />
                {celular
                  ? 'Para trazer um card, segure-o em outra coluna e solte nesta aba.'
                  : 'Arraste um card até aqui para mover.'}
              </p>
            )}
          </BoardColumn>
        ))}
      </Stagger>

      {/* Marca de "quase no fim" da coluna do celular: chegou perto, vem o
          próximo lote. A altura reservada evita que o fim da página encoste
          na marca antes da hora. */}
      {temMais && (
        <div ref={fimDaColuna} aria-hidden="true" className="h-24" />
      )}

      {/* Pré-visualização do card sendo arrastado (não é clipada pelas colunas). */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rotate-1 cursor-grabbing shadow-xl rounded-2xl">
            <TaskCard task={activeTask} project={projects.find(p => p.id === activeTask.projectId)} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
