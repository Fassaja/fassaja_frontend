import React from 'react';
import { MonthGrid, DayMarker } from '@/components/common/MonthGrid';
import { CalendarEvent } from '@/types/event';

interface AgendaMonthProps {
  date: Date; // mês exibido
  onDateChange: (date: Date) => void;
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

/**
 * Mês da Agenda. A grade em si é a mesma do Calendário (MonthGrid); o que
 * muda aqui é só o que cada dia marca: os compromissos, na cor do evento.
 */
export const AgendaMonth: React.FC<AgendaMonthProps> = ({
  date,
  onDateChange,
  events,
  selectedDate,
  onSelectDate,
}) => {
  const markersFor = (iso: string): DayMarker[] =>
    events.filter(e => e.date === iso).map(e => ({ color: e.color }));

  const monthPrefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthCount = events.filter(e => e.date.startsWith(monthPrefix)).length;

  return (
    <MonthGrid
      month={date}
      onMonthChange={onDateChange}
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      markersFor={markersFor}
      noun="evento"
      summary={
        monthCount === 0
          ? 'Nada marcado neste mês'
          : `${monthCount} ${monthCount === 1 ? 'compromisso' : 'compromissos'} neste mês`
      }
    />
  );
};
