import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Check, CalendarDays, Send, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Task, TaskStatus } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { CompleteCheck } from '@/components/common/CompleteCheck';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  /** Modo de seleção em massa: o card vira um item selecionável. */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

const statusConfig: Record<Task['status'], { label: string; className: string; dot: string }> = {
  pending: { label: 'Pendente', className: 'bg-slate-100 text-slate-600', dot: '#64748B' },
  in_progress: { label: 'Em andamento', className: 'bg-primary-light text-primary-vibrant', dot: '#2477FF' },
  completed: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700', dot: '#22C55E' },
  overdue: { label: 'Atrasada', className: 'bg-rose-100 text-rose-600', dot: '#F43F5E' },
};

// Status que o usuário pode escolher direto no card (overdue é calculado pelo servidor).
const STATUS_CHOICES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

interface StatusSelectProps {
  task: Task;
}

/** Badge de status que vira um menu para trocar pendente/andamento/concluída sem abrir o editar. */
const MENU_W = 176; // 11rem
const MENU_H = 148; // ~3 itens + padding

const StatusSelect: React.FC<StatusSelectProps> = ({ task }) => {
  const { updateTask, completeTask } = useTasks();
  const toast = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const current = statusConfig[task.status];

  // Menu via portal com posição fixa: não é cortado por colunas com scroll.
  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = rect.bottom + MENU_H > window.innerHeight;
    setPos({
      top: openUp ? rect.top - MENU_H - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - MENU_W - 8),
    });
    setOpen(true);
  };

  // Fecha ao rolar/redimensionar para o menu não "descolar" do botão.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const change = async (e: React.MouseEvent, next: TaskStatus) => {
    e.stopPropagation();
    setOpen(false);
    if (next === task.status || busy) return;
    try {
      setBusy(true);
      // Concluir passa pelo completeTask (cuida do completedAt + comemoração).
      if (next === 'completed') await completeTask(task.id);
      else await updateTask(task.id, { status: next });
      toast.success(`Status: ${statusConfig[next].label}`);
    } catch {
      toast.error('Não foi possível mudar o status. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={e => {
          e.stopPropagation();
          open ? setOpen(false) : openMenu();
        }}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mudar status"
        className={`inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-0.5 rounded-full transition-all hover:brightness-95 active:scale-95 disabled:opacity-60 ${current.className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.dot }} />
        {current.label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={e => { e.stopPropagation(); setOpen(false); }}
          />
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_W }}
            className="z-[61] rounded-xl border border-border bg-white shadow-lg overflow-hidden py-1"
            onClick={e => e.stopPropagation()}
          >
            {STATUS_CHOICES.map(value => {
              const opt = statusConfig[value];
              const isCurrent = value === task.status;
              return (
                <button
                  key={value}
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={e => change(e, value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  {isCurrent && <Check size={15} className="text-primary-vibrant shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        </>,
        document.body,
      )}
    </>
  );
};

const priorityConfig: Record<Task['priority'], { label: string; color: string; className: string }> = {
  low: { label: 'Baixa', color: '#22C55E', className: 'bg-emerald-50 text-emerald-700' },
  medium: { label: 'Média', color: '#FBBF24', className: 'bg-amber-50 text-amber-700' },
  high: { label: 'Alta', color: '#8B5CF6', className: 'bg-purple-50 text-purple-700' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onComplete,
  onDelete,
  onClick,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const { account } = useAuth();
  const { respondAssignment } = useTasks();
  const toast = useToast();
  const isCompleted = task.status === 'completed';
  const priorityInfo = priorityConfig[task.priority];
  const statusInfo = statusConfig[task.status];

  const isMyProposal =
    !!account && task.assigneeId === account.id && task.assignmentStatus === 'pending';

  const assignment =
    task.assigneeId && task.assigneeName
      ? task.assignmentStatus === 'accepted'
        ? { label: task.assigneeName, className: 'bg-emerald-50 text-emerald-700', icon: <UserCheck size={12} /> }
        : task.assignmentStatus === 'rejected'
        ? { label: `${task.assigneeName} recusou`, className: 'bg-rose-50 text-rose-600', icon: <UserX size={12} /> }
        : { label: `Proposta: ${task.assigneeName}`, className: 'bg-amber-50 text-amber-700', icon: <Send size={11} /> }
      : null;

  const respond = async (e: React.MouseEvent, action: 'accept' | 'reject') => {
    e.stopPropagation();
    if (!account) return;
    try {
      await respondAssignment(task.id, action);
      toast.success(action === 'accept' ? 'Tarefa aceita.' : 'Tarefa recusada.');
    } catch (err) {
      toast.error((err as Error).message || 'Não foi possível responder à proposta.');
    }
  };

  const handleClick = () => {
    if (selectionMode) onToggleSelect?.(task.id);
    else onClick?.(task);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      <Card
        hoverable
        onClick={handleClick}
        padding="none"
        className={`flex items-start gap-3 p-3.5 group ${
          selected ? 'ring-2 ring-primary-vibrant border-primary-vibrant' : ''
        }`}
      >
        {/* Controle à esquerda: seleção (modo massa) ou concluir (normal) */}
        {selectionMode ? (
          <span
            aria-hidden
            className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
              selected
                ? 'bg-primary-vibrant border-primary-vibrant text-white'
                : 'border-border group-hover:border-primary-vibrant'
            }`}
          >
            {selected && <Check size={13} strokeWidth={3} />}
          </span>
        ) : (
          <CompleteCheck
            completed={isCompleted}
            onToggle={() => onComplete?.(task.id)}
            className="mt-0.5"
          />
        )}

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold leading-snug truncate ${
              isCompleted ? 'line-through text-text-soft' : 'text-text-primary'
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 items-center mt-2">
            {selectionMode ? (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.className}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.dot }} />
                {statusInfo.label}
              </span>
            ) : (
              <StatusSelect task={task} />
            )}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityInfo.className}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
              {priorityInfo.label}
            </span>
            {project && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-text-primary"
                style={{ backgroundColor: project.color + '1A' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            )}
            {(task.tags ?? []).map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: tag.color + '1A', color: tag.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
            ))}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary">
                <CalendarDays size={12} className="text-text-soft" />
                {formatDate(task.dueDate)}
              </span>
            )}
            {assignment && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${assignment.className}`}
              >
                {assignment.icon}
                {assignment.label}
              </span>
            )}
          </div>

          {/* Proposta de tarefa para o usuário atual */}
          {isMyProposal && !selectionMode && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
              <span className="text-xs font-semibold text-amber-700 flex-1 min-w-0">
                Esta tarefa foi proposta a você.
              </span>
              <button
                onClick={e => respond(e, 'accept')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-success text-white hover:bg-emerald-600 active:scale-95 transition-all"
              >
                Aceitar
              </button>
              <button
                onClick={e => respond(e, 'reject')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-border text-danger hover:bg-rose-50 active:scale-95 transition-all"
              >
                Recusar
              </button>
            </div>
          )}
        </div>

        {/* Ações (escondidas no modo seleção; a exclusão em massa cuida disso) */}
        {!selectionMode && onDelete && (
          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              aria-label="Excluir tarefa"
              className="p-1.5 hover:bg-rose-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
