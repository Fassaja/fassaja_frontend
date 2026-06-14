import React from 'react';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarMonthProps {
  date: Date;
  onDateChange: (date: Date) => void;
  tasks: Task[];
  projects?: Project[];
  onSelectDate: (date: Date) => void;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  date,
  onDateChange,
  tasks,
  projects = [],
  onSelectDate,
}) => {
  const projectColor = (projectId?: string) =>
    projects.find(p => p.id === projectId)?.color ?? '#94A3B8';
  const year = date.getFullYear();
  const month = date.getMonth();

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
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
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
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-bold text-text-secondary py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayTasks = day ? getTasksForDate(day) : [];
          const isToday =
            day &&
            new Date().getDate() === day &&
            new Date().getMonth() === month &&
            new Date().getFullYear() === year;

          return (
            <button
              key={index}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={`aspect-square p-1.5 rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
                !day
                  ? 'cursor-default'
                  : isToday
                  ? 'bg-primary-vibrant text-white font-bold shadow-sm shadow-primary-vibrant/30'
                  : 'hover:bg-bg-secondary border border-transparent hover:border-border'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
              {dayTasks.length > 0 && (
                <span className="flex items-center gap-0.5 h-1.5">
                  {dayTasks.slice(0, 3).map((t, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isToday
                          ? 'rgba(255,255,255,0.9)'
                          : projectColor(t.projectId),
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda por projeto */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-border">
          {projects.map(project => (
            <span key={project.id} className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-text-soft" />
            Sem projeto
          </span>
        </div>
      )}
    </Card>
  );
};
