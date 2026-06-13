import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarMonth } from '@/components/calendar/CalendarMonth';
import { Card } from '@/components/common/Card';
import { useTasks } from '@/hooks/useTasks';

const CalendarPage: React.FC = () => {
  const { tasks, completeTask } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const tasksForSelectedDate = tasks.filter(t => t.dueDate === selectedDateStr);

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          Calendário
        </h1>
        <p className="text-text-secondary">
          Visualize suas tarefas por data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <CalendarMonth
            date={currentDate}
            onDateChange={setCurrentDate}
            tasks={tasks}
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
              <div className="space-y-3">
                {tasksForSelectedDate.map(task => (
                  <div
                    key={task.id}
                    className="p-3 bg-gray-50 rounded-lg border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => completeTask(task.id)}
                        className="w-4 h-4 mt-1 accent-primary-vibrant"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-medium ${
                            task.status === 'completed'
                              ? 'line-through text-text-secondary'
                              : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                          {task.priority === 'high' && '🔴 '}
                          {task.priority === 'medium' && '🟡 '}
                          {task.priority === 'low' && '🟢 '}
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-sm">
                Nenhuma tarefa neste dia
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
