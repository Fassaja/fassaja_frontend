import React from 'react';
import {
  Pencil,
  CalendarDays,
  Flag,
  Activity,
  FolderOpen,
  Users,
  Check,
  Clock,
  CheckCircle2,
  Tags,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { SubtaskList } from './SubtaskList';
import { Tooltip } from '@/components/common/Tooltip';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { formatDate, formatDateWithDay } from '@/utils/date';
import { tint, chipText } from '@/utils/color';

interface TaskDetailModalProps {
  isOpen: boolean;
  task?: Task;
  project?: Project;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

const statusConfig: Record<Task['status'], { label: string; className: string; dot: string }> = {
  pending: { label: 'Pendente', className: 'bg-bg-secondary text-text-secondary', dot: '#64748B' },
  in_progress: { label: 'Em andamento', className: 'bg-primary-light text-primary-vibrant', dot: '#2477FF' },
  completed: { label: 'Concluída', className: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dot: '#22C55E' },
  overdue: { label: 'Atrasada', className: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300', dot: '#F43F5E' },
};

const priorityConfig: Record<Task['priority'], { label: string; color: string }> = {
  low: { label: 'Baixa', color: '#22C55E' },
  medium: { label: 'Média', color: '#FBBF24' },
  high: { label: 'Alta', color: '#8B5CF6' },
};

interface FieldProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-9 h-9 shrink-0 rounded-xl bg-bg-secondary flex items-center justify-center text-text-soft">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-text-soft mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{children}</div>
    </div>
  </div>
);

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  task,
  project,
  onClose,
  onEdit,
}) => {
  if (!task) return null;

  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes da tarefa" size="lg">
      <div className="space-y-1">
        {/* Cabeçalho do card com título e botão de editar */}
        <div className="relative rounded-2xl border border-border bg-bg-secondary/50 p-5 pr-14 mb-4">
          {/* A posição fica no invólucro, não no botão: um <span> em fluxo com
              filho absoluto viraria uma caixa vazia no início do bloco. */}
          <Tooltip content="Editar tarefa" className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => onEdit(task)}
              aria-label="Editar tarefa"
              className="p-2 rounded-xl bg-surface border border-border text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant transition-colors active:scale-95"
            >
              <Pencil size={16} />
            </button>
          </Tooltip>

          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.className}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusInfo.dot }} />
            {statusInfo.label}
          </span>

          <h3
            className={`mt-3 text-xl font-bold leading-snug ${
              task.status === 'completed' ? 'line-through text-text-soft' : 'text-text-primary'
            }`}
          >
            {task.title}
          </h3>

          {task.description ? (
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
              {task.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-text-soft">Sem descrição.</p>
          )}
        </div>

        {/* Antes da grade de metadados, e não depois: os passos são o que a
            pessoa veio fazer; prioridade e datas são referência. */}
        <SubtaskList task={task} />

        {/* Detalhes em grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y divide-border sm:divide-y-0">
          <Field icon={<Activity size={18} />} label="Status">
            {statusInfo.label}
          </Field>

          <Field icon={<Flag size={18} />} label="Prioridade">
            <span className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: priorityInfo.color }} />
              {priorityInfo.label}
            </span>
          </Field>

          <Field icon={<FolderOpen size={18} />} label="Projeto">
            {project ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
            ) : (
              <span className="text-text-soft font-medium">Sem projeto</span>
            )}
          </Field>

          <Field icon={<CalendarDays size={18} />} label="Vencimento">
            {task.dueDate ? (
              formatDateWithDay(task.dueDate)
            ) : (
              <span className="text-text-soft font-medium">Sem data</span>
            )}
          </Field>

          {(task.assignees ?? []).length > 0 && (
            <Field
              icon={<Users size={18} />}
              label={`Responsáveis · ${(task.assignees ?? []).filter(a => a.done).length} de ${
                (task.assignees ?? []).length
              }`}
            >
              {/* Uma linha por pessoa, com quem já entregou marcado. É aqui que
                  a pergunta "quem ainda falta?" tem resposta — o card mostra só
                  o número. */}
              <ul className="flex flex-col gap-1.5">
                {(task.assignees ?? []).map(a => (
                  <li key={a.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                        a.done ? 'bg-success text-white' : 'border-2 border-border'
                      }`}
                    >
                      {a.done && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={a.done ? 'text-text-soft line-through' : 'text-text-primary'}>
                      {a.name}
                    </span>
                  </li>
                ))}
              </ul>
            </Field>
          )}

          {task.tags && task.tags.length > 0 && (
            <Field icon={<Tags size={18} />} label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: tint(tag.color), color: chipText(tag.color) }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </span>
                ))}
              </div>
            </Field>
          )}

          <Field icon={<Clock size={18} />} label="Criada em">
            {formatDate(task.createdAt)}
          </Field>

          {task.completedAt && (
            <Field icon={<CheckCircle2 size={18} />} label="Concluída em">
              {formatDate(task.completedAt)}
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
};
