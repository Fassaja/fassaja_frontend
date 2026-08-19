import React, { useMemo, useState } from 'react';
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
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';
import { TaskCard } from './TaskCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';
import { combinaComProjeto } from '@/utils/taskFilters';

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
}

type ColumnKey = 'pending' | 'in_progress' | 'completed';

// Colunas do quadro. "overdue" (calculado no servidor) entra em Pendente:
// é uma tarefa não concluída, só que atrasada — o card já mostra o badge vermelho.
const COLUMNS: {
  key: ColumnKey;
  label: string;
  hint: string;
  color: string;
  tint: string;
  statuses: TaskStatus[];
}[] = [
  {
    key: 'pending',
    label: 'Pendente',
    hint: 'Ainda não começou',
    color: '#64748B',
    tint: 'bg-bg-secondary',
    statuses: ['pending', 'overdue'],
  },
  {
    key: 'in_progress',
    label: 'Em andamento',
    hint: 'Em execução agora',
    color: '#2477FF',
    tint: 'bg-primary-light/50',
    statuses: ['in_progress'],
  },
  {
    key: 'completed',
    label: 'Concluída',
    hint: 'Já finalizou',
    color: '#22C55E',
    tint: 'bg-emerald-50 dark:bg-emerald-500/10',
    statuses: ['completed'],
  },
];

// Coluna onde a tarefa vive hoje (pending e overdue caem na mesma).
function columnOf(status: TaskStatus): ColumnKey {
  if (status === 'completed') return 'completed';
  if (status === 'in_progress') return 'in_progress';
  return 'pending';
}

// Zona de soltar = corpo da coluna. Destaca quando há um card por cima.
const BoardColumn: React.FC<{
  col: (typeof COLUMNS)[number];
  count: number;
  children: React.ReactNode;
}> = ({ col, count, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-bg-secondary/60 md:min-h-0 md:overflow-hidden">
      <header className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
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
}) => {
  const { updateTask, completeTask } = useTasks();
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const activeTask = activeId ? filtered.find(t => t.id === activeId) ?? null : null;

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    const id = String(e.active.id);
    setActiveId(null);

    const task = filtered.find(t => t.id === id);
    if (!task) return;

    const overId = e.over ? (String(e.over.id) as ColumnKey) : null;
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
      if (overId === 'completed') await completeTask(id);
      else await updateTask(id, { status: overId });
      toast.success(`Movida para ${label}`);
    } catch {
      toast.error('Não foi possível mover a tarefa. Tente novamente.');
    }
  };

  if (filtered.length === 0) {
    return (
      <EmptyState
        mascotState="confused"
        title="Nenhuma tarefa encontrada"
        description="Ajuste seus filtros ou crie uma nova tarefa para começar"
      />
    );
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:h-[calc(100vh-12rem)]">
        {columns.map(col => (
          <BoardColumn key={col.key} col={col} count={col.items.length}>
            {col.items.length > 0 ? (
              col.items.map(task => (
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
                Arraste um card até aqui para mover.
              </p>
            )}
          </BoardColumn>
        ))}
      </div>

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
