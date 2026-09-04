import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Section } from '@/components/common/Section';
import { CompleteCheck } from '@/components/common/CompleteCheck';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { formatDate, isToday, isTomorrow } from '@/utils/date';

interface UpcomingTasksProps {
  tasks: Task[];
  projects?: Project[];
  onComplete?: (taskId: string) => void;
}

const priorityBadge: Record<Task['priority'], { label: string; className: string }> = {
  high: { label: 'Alta', className: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300' },
  medium: { label: 'Média', className: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  low: { label: 'Baixa', className: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
};

function dueBadge(task: Task) {
  if (!task.dueDate) return null;
  if (isToday(task.dueDate)) return { label: 'Hoje', className: 'bg-primary-light text-primary-vibrant' };
  if (isTomorrow(task.dueDate)) return { label: 'Amanhã', className: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' };
  return { label: formatDate(task.dueDate), className: 'bg-bg-secondary text-text-secondary' };
}

/**
 * Concluir uma tarefa aqui a TIRA da lista — e até agora ela sumia de um
 * quadro para o outro, sem nada que ligasse o clique ao desaparecimento. A
 * linha agora sai deslizando e as de baixo sobem para ocupar o lugar, que é o
 * único jeito de a pessoa ver que foi ela quem causou aquilo.
 *
 * A animação é escrita aqui, e não com o <AnimatedList>, porque aquele
 * componente monta <div>: isto é uma LISTA de tarefas, e trocar <ul>/<li> por
 * divs custaria a contagem de itens que o leitor de tela anuncia.
 *
 * `mode="popLayout"` tira quem sai do fluxo para as outras subirem durante o
 * sumiço, e `layout="position"` anima só a posição — animar a altura junto
 * espremeria o texto da linha por alguns quadros.
 */
export const UpcomingTasks: React.FC<UpcomingTasksProps> = ({ tasks, projects = [], onComplete }) => {
  return (
    <Section title="Próximas tarefas" className="h-full">
      {/* Sem linha entre as tarefas: cada uma já tem forma própria — a marca
          de concluir à esquerda e as duas etiquetas à direita —, e o filete
          só endurecia a lista, que é o bloco em que o olho mais desce. */}
      <ul className="space-y-1">
        <AnimatePresence mode="popLayout" initial={false}>
        {tasks.map(task => {
          const completed = task.status === 'completed';
          const due = dueBadge(task);
          const priority = priorityBadge[task.priority];
          const project = projects.find(p => p.id === task.projectId);

          return (
            <motion.li
              key={task.id}
              layout="position"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
            >
              <CompleteCheck completed={completed} onToggle={() => onComplete?.(task.id)} />

              {project && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: project.color }}
                  title={project.name}
                />
              )}

              <span
                className={`flex-1 min-w-0 truncate text-sm font-medium ${
                  completed ? 'line-through text-text-soft' : 'text-text-primary'
                }`}
              >
                {task.title}
              </span>

              {due && (
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${due.className}`}>
                  {due.label}
                </span>
              )}

              <span
                className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  completed ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : priority.className
                }`}
              >
                {completed ? 'Concluída' : priority.label}
              </span>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>
    </Section>
  );
};
