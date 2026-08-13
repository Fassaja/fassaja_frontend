import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { DayPanel } from '@/components/common/DayPanel';
import { Mascot } from '@/components/mascot/Mascot';
import { CalendarSkeleton } from '@/components/common/Skeletons';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { toISODate } from '@/utils/date';
import { Task } from '@/types/task';

/**
 * Rótulo e cor de cada prioridade. A cor sai dos tokens `priority.*` (classe
 * Tailwind), não de um hex fixo: os hex antigos (#8B5CF6, #FBBF24, #22C55E)
 * eram os valores do tema CLARO e não acompanhavam a troca de tema.
 */
const PRIORITY: Record<Task['priority'], { label: string; dot: string }> = {
  high: { label: 'Alta', dot: 'bg-priority-high' },
  medium: { label: 'Média', dot: 'bg-priority-medium' },
  low: { label: 'Baixa', dot: 'bg-priority-low' },
};

const CalendarPage: React.FC = () => {
  const { tasks, completeTask, loading } = useTasks();
  const showSkeleton = useDeferredLoading(loading);
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const matchesFilter = (projectId?: string) =>
    projectFilter === 'all' ||
    (projectFilter === '__none__' ? !projectId : projectId === projectFilter);

  const visibleTasks = tasks.filter(t => matchesFilter(t.projectId));

  const selectedDateStr = toISODate(selectedDate);
  const tasksForSelectedDate = visibleTasks.filter(t => t.dueDate === selectedDateStr);

  return (
    <AppLayout title="Calendário" subtitle="Os prazos das suas tarefas, mês a mês.">
      <PageTour id="calendar" />
      {loading ? (showSkeleton ? <CalendarSkeleton /> : null) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarMonth
            date={currentDate}
            onDateChange={setCurrentDate}
            tasks={visibleTasks}
            projects={projects}
            activeProject={projectFilter}
            onProjectFilter={setProjectFilter}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Tarefas com prazo na data selecionada */}
        <div>
          <DayPanel
            date={selectedDate}
            count={tasksForSelectedDate.length}
            noun="tarefa"
            onToday={() => {
              const now = new Date();
              setCurrentDate(now);
              setSelectedDate(now);
            }}
            empty={
              <div className="flex flex-col items-center text-center py-6">
                <Mascot state="happy" size="sm" animate />
                <p className="text-text-primary font-semibold mt-3">Sem prazos</p>
                <p className="text-text-secondary text-sm">
                  Nenhuma tarefa vence nesta data.
                </p>
              </div>
            }
          >
              <ul className="space-y-3">
                {tasksForSelectedDate.map(task => {
                  const completed = task.status === 'completed';
                  const overdue = task.status === 'overdue';
                  const priority = PRIORITY[task.priority];

                  return (
                    <li
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        overdue ? 'border-danger/30 bg-danger/10' : 'border-border bg-bg-secondary'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => completeTask(task.id)}
                        aria-label={completed ? 'Tarefa concluída' : 'Marcar como concluída'}
                        className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          completed ? 'bg-success text-white' : 'border-2 border-border hover:border-primary-vibrant'
                        }`}
                      >
                        {completed && <Check size={13} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            completed ? 'line-through text-text-soft' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </p>
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                          <span className={`w-2 h-2 rounded-full ${priority.dot}`} />
                          {priority.label}
                          {overdue && <span className="text-danger font-semibold">· Atrasada</span>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
          </DayPanel>
        </div>
      </div>
      )}
    </AppLayout>
  );
};

export default CalendarPage;
