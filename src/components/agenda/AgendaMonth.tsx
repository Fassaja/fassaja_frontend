import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { CalendarEvent } from '@/types/event';
import { toISODate } from '@/utils/date';

interface AgendaMonthProps {
  date: Date; // mês exibido
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const AgendaMonth: React.FC<AgendaMonthProps> = ({
  date,
  onDateChange,
  events,
  selectedDate,
  onSelectDate,
}) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const startingDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayISO = toISODate(new Date());
  const selectedISO = toISODate(selectedDate);

  const eventsForDay = (day: number) => {
    const iso = toISODate(new Date(year, month, day));
    return events.filter(e => e.date === iso);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => onDateChange(new Date(year, month - 1, 1))}
            aria-label="Mês anterior"
            className="p-2 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <button
            onClick={() => onDateChange(new Date(year, month + 1, 1))}
            aria-label="Próximo mês"
            className="p-2 rounded-xl border border-border hover:bg-bg-secondary transition-colors"
          >
            <ChevronRight size={20} className="text-text-secondary" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {WEEK_DAYS.map(d => (
          <div key={d} className="text-center text-xs font-bold text-text-secondary py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, index) => {
          if (!day) return <div key={index} className="h-12 sm:h-14" />;

          const iso = toISODate(new Date(year, month, day));
          const dayEvents = eventsForDay(day);
          const isToday = iso === todayISO;
          const isSelected = iso === selectedISO;

          return (
            <button
              key={index}
              onClick={() => onSelectDate(new Date(year, month, day))}
              className={`h-12 sm:h-14 p-1 rounded-xl transition-all flex flex-col items-center justify-center gap-1 border ${
                isToday
                  ? 'bg-primary-vibrant text-white font-bold border-transparent shadow-sm shadow-primary-vibrant/30'
                  : isSelected
                  ? 'bg-primary-light text-primary-vibrant font-bold border-primary-vibrant'
                  : 'border-transparent hover:bg-bg-secondary hover:border-border'
              }`}
            >
              <span className="text-sm font-medium">{day}</span>
              {dayEvents.length > 0 && (
                <span className="flex items-center gap-0.5 h-1.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: isToday ? 'rgba(255,255,255,0.9)' : e.color,
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
};
