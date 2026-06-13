import React from 'react';
import { Task } from '@/types/task';
import { Card } from '@/components/common/Card';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarMonthProps {
  date: Date;
  onDateChange: (date: Date) => void;
  tasks: Task[];
  onSelectDate: (date: Date) => void;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  date,
  onDateChange,
  tasks,
  onSelectDate,
}) => {
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

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

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
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
              className={`aspect-square p-2 rounded-lg transition-all text-xs ${
                !day
                  ? 'bg-transparent cursor-default'
                  : isToday
                  ? 'bg-primary-vibrant text-white font-bold'
                  : dayTasks.length > 0
                  ? 'bg-blue-50 border-2 border-primary-vibrant'
                  : 'hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="font-medium">{day}</div>
              {dayTasks.length > 0 && (
                <div className="text-xs mt-1">
                  {dayTasks.length === 1 ? '1 tarefa' : `${dayTasks.length} tarefas`}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
