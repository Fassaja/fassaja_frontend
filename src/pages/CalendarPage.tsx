import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { Card } from '@/components/common/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { toISODate } from '@/utils/date';

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
    <AppLayout title="Calendário" subtitle="Visualize suas tarefas por data.">
      {loading ? (showSkeleton ? <LoadingScreen /> : null) : (
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
          />
        </div>

        {/* Tasks for selected date */}
        <div>
          <Card>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-text-primary capitalize leading-tight">
                  {selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {tasksForSelectedDate.length === 0
                    ? 'Nenhuma tarefa nesta data'
                    : `${tasksForSelectedDate.length} tarefa${tasksForSelectedDate.length === 1 ? '' : 's'} nesta data`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDate(now);
                }}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-vibrant bg-primary-light hover:brightness-95 active:scale-95 transition-all"
              >
                Hoje
              </button>
            </div>

            {tasksForSelectedDate.length > 0 ? (
              <ul className="space-y-3">
                {tasksForSelectedDate.map(task => {
                  const completed = task.status === 'completed';
                  const overdue = task.status === 'overdue';
                  const priority = {
                    high: { label: 'Alta', color: '#8B5CF6' },
                    medium: { label: 'Média', color: '#FBBF24' },
                    low: { label: 'Baixa', color: '#22C55E' },
                  }[task.priority];

                  return (
                    <li
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 ${
                        overdue ? 'border-rose-200 bg-rose-50' : 'border-border bg-bg-secondary'
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
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priority.color }} />
                          {priority.label}
                          {overdue && <span className="text-rose-600 font-semibold">· Atrasada</span>}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex flex-col items-center text-center py-6">
                <Mascot state="celebrate" size="sm" animate />
                <p className="text-text-primary font-semibold mt-3">Dia livre!</p>
                <p className="text-text-secondary text-sm">Nenhuma tarefa para esta data.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
      )}
    </AppLayout>
  );
};

export default CalendarPage;
