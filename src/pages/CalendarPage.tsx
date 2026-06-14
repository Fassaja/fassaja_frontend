import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { Card } from '@/components/common/Card';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';

const CalendarPage: React.FC = () => {
  const { tasks, completeTask } = useTasks();
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const tasksForSelectedDate = tasks.filter(t => t.dueDate === selectedDateStr);

  return (
    <AppLayout title="Calendário" subtitle="Visualize suas tarefas por data.">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarMonth
            date={currentDate}
            onDateChange={setCurrentDate}
            tasks={tasks}
            projects={projects}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Tasks for selected date */}
        <div>
          <Card>
            <h3 className="text-lg font-bold text-text-primary mb-4">
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>

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
              <p className="text-text-secondary text-sm">Nenhuma tarefa neste dia.</p>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
