import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { AlertTriangle, Plus } from 'lucide-react';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';
import { initialsOf } from '@/contexts/UserContext';
import { formatDate } from '@/utils/date';
import { BOARD_COLUMNS, columnOf, type ColumnKey } from '@/utils/taskColumns';
import { memberColor } from './TeamTaskRow';

const PRIORITY: Record<Task['priority'], { label: string; cls: string }> = {
  low: { label: 'Baixa', cls: 'bg-bg-secondary text-text-secondary' },
  medium: { label: 'Média', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  high: { label: 'Alta', cls: 'bg-danger/15 text-danger' },
};

interface Props {
  tasks: Task[];
  members: TeamMember[];
  /** Abre a tarefa. */
  onOpen: (task: Task) => void;
  /** Cria uma tarefa já naquela coluna. Ausente = quem olha não distribui. */
  onAdd?: (status: ColumnKey) => void;
  /** Recarrega o painel depois de mover — o resumo não escuta o contexto. */
  onMoved?: () => void;
}

/** Card compacto: título, prioridade, quem responde e o prazo. Nada além. */
const FlowCard: React.FC<{ task: Task; members: TeamMember[]; onOpen: () => void }> = ({
  task,
  members,
  onOpen,
}) => {
  const prio = PRIORITY[task.priority];
  const dono = (task.assignees ?? [])[0];
  const membro = dono ? members.find(m => m.userId === dono.id) : undefined;
  const atrasada = task.status === 'overdue';

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-all hover:border-primary-vibrant/40 hover:shadow-md"
    >
      <p
        className={`mb-2 line-clamp-2 text-sm font-semibold ${
          task.status === 'completed' ? 'text-text-soft line-through' : 'text-text-primary'
        }`}
      >
        {task.title}
      </p>
      <span
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${prio.cls}`}
      >
        {atrasada && <AlertTriangle size={10} />}
        {atrasada ? 'Atrasada' : prio.label}
      </span>
      <div className="mt-2.5 flex items-center gap-2">
        {dono ? (
          <>
            {membro?.avatar ? (
              <img src={membro.avatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
            ) : (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ backgroundColor: memberColor(dono.id) }}
              >
                {initialsOf(membro?.name ?? dono.name)}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">
              {membro?.name ?? dono.name}
              {(task.assignees ?? []).length > 1 && (
                <span className="text-text-soft"> +{(task.assignees ?? []).length - 1}</span>
              )}
            </span>
          </>
        ) : (
          // Sem responsável é informação, não espaço vazio: é a tarefa que
          // ninguém pegou e que por isso não aparece na carga de ninguém.
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-amber-600 dark:text-amber-400">
            Sem responsável
          </span>
        )}
        {task.dueDate && (
          <span className="shrink-0 text-xs tabular-nums text-text-soft">
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </button>
  );
};

const Coluna: React.FC<{
  col: (typeof BOARD_COLUMNS)[number];
  count: number;
  onAdd?: () => void;
  children: React.ReactNode;
}> = ({ col, count, onAdd, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section className="flex min-w-0 flex-col">
      <header className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
        <h3 className="text-sm font-bold text-text-primary">{col.label}</h3>
        <span className="text-xs font-bold tabular-nums text-text-soft">{count}</span>
      </header>
      <div
        ref={setNodeRef}
        /* Altura máxima com rolagem própria: a coluna "Concluída" cresce sem
           limite, e sem o teto ela esticaria o painel inteiro — as outras duas
           ficariam com um vazio de vários palmos ao lado. */
        className={`max-h-[30rem] flex-1 space-y-2.5 overflow-y-auto rounded-xl p-2 transition-colors ${
          isOver ? 'bg-primary-light ring-2 ring-inset ring-primary-vibrant/50' : 'bg-bg-secondary/50'
        }`}
      >
        {children}
      </div>
      {/* FORA da área rolável: dentro dela, o botão descia com os cards e
          sumia na coluna mais cheia — a única em que ele importa. */}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-primary-vibrant/50 hover:text-primary-vibrant"
        >
          <Plus size={14} /> Adicionar tarefa
        </button>
      )}
    </section>
  );
};

const Arrastavel: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`select-none ${isDragging ? 'opacity-40' : ''} cursor-grab active:cursor-grabbing`}
    >
      {children}
    </div>
  );
};

/**
 * O fluxo de trabalho da equipe, dentro do painel.
 *
 * Substituiu a lista de "Tarefas da equipe", que respondia "o que existe" mas
 * não "onde cada coisa está" — e era justamente o estado do trabalho que
 * quem administra vem procurar aqui.
 *
 * As colunas vêm de `taskColumns`, as MESMAS de Minhas Tarefas: um quadro que
 * discordasse do outro sobre onde uma tarefa vive seria pior que não ter
 * quadro nenhum. Arrastar usa o mesmo caminho de escrita (completeTask para
 * concluir, updateTask para o resto), então a comemoração e o `completedAt`
 * acontecem igual nos dois lugares.
 */
export const TeamFlowBoard: React.FC<Props> = ({ tasks, members, onOpen, onAdd, onMoved }) => {
  const { updateTask, completeTask } = useTasks();
  const toast = useToast();
  const [ativo, setAtivo] = useState<string | null>(null);

  // Ponteiro: arrasta após 8px (o clique continua abrindo a tarefa).
  // Toque: segura 200ms, senão a coluna não rolaria mais com o dedo.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const colunas = useMemo(
    () =>
      BOARD_COLUMNS.map(col => ({
        ...col,
        itens: tasks.filter(t => col.statuses.includes(t.status)),
      })),
    [tasks],
  );

  const tarefaAtiva = ativo ? tasks.find(t => t.id === ativo) ?? null : null;

  const aoSoltar = async (e: DragEndEvent) => {
    const id = String(e.active.id);
    setAtivo(null);
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const destino = e.over ? (String(e.over.id) as ColumnKey) : null;
    const origem = columnOf(task.status);

    // Mesma regra do quadro completo: atrasada não muda de status arrastando,
    // porque "atrasada" é derivado do prazo, não um estado que se escolhe.
    if (task.status === 'overdue') {
      if (destino && destino !== origem) {
        toast.info('Tarefa atrasada não muda de coluna arrastando. Abra a tarefa e edite o prazo.');
      }
      return;
    }
    if (!destino || destino === origem) return;

    const rotulo = BOARD_COLUMNS.find(c => c.key === destino)?.label ?? '';
    try {
      if (destino === 'completed') await completeTask(id);
      else await updateTask(id, { status: destino });
      toast.success(`Movida para ${rotulo}`);
      onMoved?.();
    } catch (err) {
      // A recusa mais provável aqui é de permissão: membro comum não move
      // tarefa de projeto de equipe. Mostrar a mensagem do servidor diz POR QUE
      // em vez de deixar o card voltando sozinho sem explicação.
      toast.error((err as Error).message || 'Não foi possível mover a tarefa.');
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={(e: DragStartEvent) => setAtivo(String(e.active.id))}
      onDragEnd={aoSoltar}
      onDragCancel={() => setAtivo(null)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {colunas.map(col => (
          <Coluna
            key={col.key}
            col={col}
            count={col.itens.length}
            onAdd={onAdd ? () => onAdd(col.key) : undefined}
          >
            {col.itens.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-text-soft">Nada aqui ainda.</p>
            ) : (
              col.itens.map(t => (
                <Arrastavel key={t.id} id={t.id}>
                  <FlowCard task={t} members={members} onOpen={() => onOpen(t)} />
                </Arrastavel>
              ))
            )}
          </Coluna>
        ))}
      </div>

      {/* Pré-visualização do card arrastado — fora das colunas, para não ser
          cortada por elas. */}
      <DragOverlay dropAnimation={null}>
        {tarefaAtiva ? (
          <div className="rotate-1 cursor-grabbing rounded-xl shadow-xl">
            <FlowCard task={tarefaAtiva} members={members} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
