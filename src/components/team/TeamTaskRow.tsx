import React from 'react';
import { Calendar, CheckCircle2, Circle } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { initialsOf } from '@/contexts/UserContext';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';
import { formatDate, isToday, isTomorrow } from '@/utils/date';
import { AVATAR_COLORS } from './teamConstants';

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};
const PRIORITY_VARIANT: Record<Task['priority'], 'default' | 'warning' | 'danger'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
};

/** Cor de avatar estável por pessoa — não muda se a lista reordena. */
export function memberColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Rótulo + cor do prazo. "Hoje" e "Amanhã" valem mais que a data escrita. */
export function dueLabel(t: Task): { text: string; cls: string } {
  if (t.status === 'completed') return { text: 'Concluída', cls: 'text-success' };
  if (!t.dueDate) return { text: 'Sem prazo', cls: 'text-text-soft' };
  if (isToday(t.dueDate)) return { text: 'Hoje', cls: 'text-danger' };
  if (isTomorrow(t.dueDate)) return { text: 'Amanhã', cls: 'text-amber-600 dark:text-amber-300' };
  return { text: formatDate(t.dueDate), cls: 'text-text-secondary' };
}

interface Props {
  task: Task;
  members: TeamMember[];
  /** Abre a tarefa. Sem isto a linha é só leitura — e era esse o problema. */
  onOpen?: (task: Task) => void;
}

/**
 * Uma tarefa da equipe, em uma linha.
 *
 * A mudança em relação à versão anterior é o clique: as linhas eram um mural
 * sem saída — dava para ver que algo estava atrasado e não havia como chegar
 * até aquilo. Toda linha agora leva à tarefa.
 */
export const TeamTaskRow: React.FC<Props> = ({ task, members, onOpen }) => {
  const due = dueLabel(task);
  const responsaveis = task.assignees ?? [];
  const done = task.status === 'completed';

  return (
    <button
      type="button"
      onClick={() => onOpen?.(task)}
      disabled={!onOpen}
      className="flex w-full items-center gap-3 rounded-lg py-2.5 pl-1 pr-2 text-left transition-colors enabled:hover:bg-bg-secondary/70 disabled:cursor-default"
    >
      {done ? (
        <CheckCircle2 size={18} className="shrink-0 text-success" />
      ) : (
        <Circle size={18} className="shrink-0 text-text-soft" />
      )}
      <p
        className={`min-w-0 flex-1 truncate text-sm font-medium ${
          done ? 'text-text-soft line-through' : 'text-text-primary'
        }`}
      >
        {task.title}
      </p>
      <span
        className={`hidden shrink-0 items-center gap-1 text-xs font-medium sm:inline-flex ${due.cls}`}
      >
        <Calendar size={12} /> {due.text}
      </span>
      <Badge variant={PRIORITY_VARIANT[task.priority]} className="shrink-0">
        {PRIORITY_LABEL[task.priority]}
      </Badge>
      {/* Uma bolinha por responsável, anel verde para quem já entregou. Pilha
          sobreposta porque a linha é estreita e o número de pessoas varia — o
          nome completo fica no title. */}
      {responsaveis.length > 0 ? (
        <div className="flex shrink-0 -space-x-1.5">
          {responsaveis.slice(0, 4).map(a => {
            const membro = members.find(m => m.userId === a.id);
            return (
              <span
                key={a.id}
                title={`${a.name}${a.done ? ' — entregou' : ' — ainda deve'}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-main text-[10px] font-bold text-white ${
                  a.done ? 'ring-2 ring-success' : ''
                }`}
                style={{ backgroundColor: memberColor(a.id) }}
              >
                {initialsOf(membro?.name ?? a.name)}
              </span>
            );
          })}
          {responsaveis.length > 4 && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-main bg-bg-secondary text-[10px] font-bold text-text-secondary">
              +{responsaveis.length - 4}
            </span>
          )}
        </div>
      ) : (
        // Espaço reservado: sem ele as linhas com e sem responsável teriam
        // larguras diferentes e a coluna de prazo desalinharia.
        <span className="h-7 w-7 shrink-0" aria-hidden />
      )}
    </button>
  );
};
