import React from 'react';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toISODate } from '@/utils/date';

interface CalendarMonthProps {
  date: Date;
  onDateChange: (date: Date) => void;
  tasks: Task[];
  projects?: Project[];
  activeProject?: string;
  onProjectFilter?: (value: string) => void;
  onSelectDate: (date: Date) => void;
  /** Dia aberto no painel lateral — precisa se ver na grade. */
  selectedDate?: Date;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  date,
  onDateChange,
  tasks,
  projects = [],
  activeProject = 'all',
  onProjectFilter,
  onSelectDate,
  selectedDate,
}) => {
  const projectColor = (projectId?: string) =>
    projects.find(p => p.id === projectId)?.color ?? '#94A3B8';
  const year = date.getFullYear();
  const month = date.getMonth();
  const todayISO = toISODate(new Date());
  const selectedISO = selectedDate ? toISODate(selectedDate) : null;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getTasksForDate = (day: number) => {
    const dateStr = toISODate(new Date(year, month, day));
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const handlePrevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    onSelectDate(new Date(year, month, day));
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="p-2 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="p-2 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
          >
            <ChevronRight size={20} className="text-text-secondary" />
          </button>
        </div>
      </div>

      {/* Week days */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-bold text-text-secondary py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          const dayTasks = day ? getTasksForDate(day) : [];
          const isToday = day !== null && toISODate(new Date(year, month, day)) === todayISO;
          const isSelected =
            day !== null && selectedISO !== null && toISODate(new Date(year, month, day)) === selectedISO;
          // Esta tela é sobre PRAZOS: um dia com tarefa atrasada precisa gritar
          // mais alto que a cor do projeto.
          const hasOverdue = dayTasks.some(t => t.status === 'overdue');

          return (
            <button
              key={index}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              aria-current={isToday ? 'date' : undefined}
              aria-pressed={day ? isSelected : undefined}
              className={`h-12 sm:h-14 p-1 rounded-xl transition-all flex flex-col items-center justify-center gap-1 border ${
                !day
                  ? 'cursor-default border-transparent'
                  : isToday
                  ? 'bg-primary-vibrant text-white font-bold border-transparent shadow-sm shadow-primary-vibrant/30'
                  : isSelected
                  ? 'bg-primary-light text-primary-vibrant font-bold border-primary-vibrant'
                  : hasOverdue
                  ? 'border-danger/40 bg-danger/5 hover:bg-danger/10'
                  : 'border-transparent hover:bg-bg-secondary hover:border-border'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
              {dayTasks.length > 0 && (
                <span className="flex items-center gap-0.5 h-1.5">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        !isToday && t.status === 'overdue' ? 'bg-danger' : ''
                      }`}
                      style={
                        isToday
                          ? { backgroundColor: 'rgba(255,255,255,0.9)' }
                          : t.status === 'overdue'
                          ? undefined
                          : { backgroundColor: projectColor(t.projectId) }
                      }
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda / filtro por projeto */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-border">
          {[
            ...projects.map(p => ({ value: p.id, label: p.name, color: p.color })),
            { value: '__none__', label: 'Sem projeto', color: '#94A3B8' },
          ].map(item => {
            const active = activeProject === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onProjectFilter?.(active ? 'all' : item.value)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-border text-text-secondary hover:bg-bg-secondary'
                }`}
                style={active ? { backgroundColor: item.color } : undefined}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.9)' : item.color }}
                />
                {item.label}
              </button>
            );
          })}
          {activeProject !== 'all' && (
            <button
              type="button"
              onClick={() => onProjectFilter?.('all')}
              className="text-xs font-semibold text-primary-vibrant hover:text-primary-hover ml-1"
            >
              Mostrar todos
            </button>
          )}
        </div>
      )}
    </Card>
  );
};
