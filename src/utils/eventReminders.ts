// Lógica pura dos lembretes da Agenda (sem React/DOM — fácil de testar).
import type { CalendarEvent } from '@/types/event';

// Eventos de dia inteiro não têm horário; ancoramos o lembrete às 09:00.
export const ALL_DAY_ANCHOR = '09:00';

export interface ReminderOption {
  value: string; // string vazia = sem lembrete; senão minutos como texto
  label: string;
  minutes: number | null;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: '', label: 'Sem lembrete', minutes: null },
  { value: '0', label: 'No horário', minutes: 0 },
  { value: '5', label: '5 minutos antes', minutes: 5 },
  { value: '10', label: '10 minutos antes', minutes: 10 },
  { value: '15', label: '15 minutos antes', minutes: 15 },
  { value: '30', label: '30 minutos antes', minutes: 30 },
  { value: '60', label: '1 hora antes', minutes: 60 },
  { value: '120', label: '2 horas antes', minutes: 120 },
  { value: '1440', label: '1 dia antes', minutes: 1440 },
];

type EventLike = Pick<CalendarEvent, 'date' | 'startTime' | 'allDay'> &
  Partial<Pick<CalendarEvent, 'reminderMinutes' | 'endTime'>>;

/** Data/hora de início do evento (dia inteiro ancorado às 09:00). */
export function eventStartDate(e: EventLike): Date | null {
  const [y, m, d] = e.date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const time = e.allDay ? ALL_DAY_ANCHOR : e.startTime || '00:00';
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

/** Fim do evento, para saber até quando o lembrete ainda é relevante. */
export function eventEndDate(e: EventLike): Date | null {
  const start = eventStartDate(e);
  if (!start) return null;
  if (e.allDay) {
    const [y, m, d] = e.date.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 0);
  }
  if (e.endTime) {
    const [y, m, d] = e.date.split('-').map(Number);
    const [hh, mm] = e.endTime.split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
  }
  // Sem término: considera 1 hora de duração.
  return new Date(start.getTime() + 60 * 60000);
}

/** Quando o lembrete deve disparar (null quando não há lembrete). */
export function reminderTriggerDate(e: EventLike): Date | null {
  if (e.reminderMinutes === null || e.reminderMinutes === undefined) return null;
  const start = eventStartDate(e);
  if (!start) return null;
  return new Date(start.getTime() - e.reminderMinutes * 60000);
}

/** Rótulo curto do lembrete (para exibição). */
export function reminderLabel(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '';
  const opt = REMINDER_OPTIONS.find(o => o.minutes === minutes);
  if (opt) return opt.label;
  if (minutes === 0) return 'No horário';
  if (minutes % 1440 === 0) return `${minutes / 1440} dia(s) antes`;
  if (minutes % 60 === 0) return `${minutes / 60} h antes`;
  return `${minutes} min antes`;
}
