import React from 'react';
import { Pencil, CalendarDays, Clock, MapPin, Bell, Link2, AlignLeft } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { CalendarEvent } from '@/types/event';
import { formatDate, formatDateWithDay } from '@/utils/date';
import { reminderLabel } from '@/utils/eventReminders';

interface EventDetailModalProps {
  isOpen: boolean;
  event?: CalendarEvent | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
}

function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return 'Dia inteiro';
  if (e.startTime && e.endTime) return `${e.startTime} – ${e.endTime}`;
  if (e.startTime) return `A partir das ${e.startTime}`;
  return 'Sem horário';
}

const Field: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="flex items-start gap-3 py-3">
    <div className="w-9 h-9 shrink-0 rounded-xl bg-bg-secondary flex items-center justify-center text-text-soft">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-text-soft mb-0.5">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{children}</div>
    </div>
  </div>
);

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
}) => {
  if (!event) return null;

  const hasReminder = event.reminderMinutes !== null && event.reminderMinutes !== undefined;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do evento" size="lg">
      <div className="space-y-1">
        {/* Cabeçalho com a cor do evento, título e botão de editar */}
        <div className="relative rounded-2xl border border-border bg-bg-secondary/50 p-5 pr-14 mb-4">
          <button
            type="button"
            onClick={() => onEdit(event)}
            aria-label="Editar evento"
            title="Editar evento"
            className="absolute top-4 right-4 p-2 rounded-xl bg-white border border-border text-text-secondary hover:text-primary-vibrant hover:border-primary-vibrant transition-colors active:scale-95"
          >
            <Pencil size={16} />
          </button>

          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: event.color + '1A', color: event.color }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color }} />
            {timeLabel(event)}
          </span>

          <h3 className="mt-3 text-xl font-bold leading-snug text-text-primary">{event.title}</h3>

          {event.description ? (
            <p className="mt-2 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-text-soft">Sem descrição.</p>
          )}
        </div>

        {/* Detalhes em grade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 divide-y divide-border sm:divide-y-0">
          <Field icon={<CalendarDays size={18} />} label="Data">
            <span className="capitalize">{formatDateWithDay(event.date)}</span>
          </Field>

          <Field icon={<Clock size={18} />} label="Horário">
            {timeLabel(event)}
          </Field>

          <Field icon={<MapPin size={18} />} label="Local">
            {event.location ? event.location : <span className="text-text-soft font-medium">Sem local</span>}
          </Field>

          <Field icon={<Bell size={18} />} label="Lembrete">
            {hasReminder ? (
              reminderLabel(event.reminderMinutes)
            ) : (
              <span className="text-text-soft font-medium">Sem lembrete</span>
            )}
          </Field>

          {event.taskTitle && (
            <Field icon={<Link2 size={18} />} label="Tarefa vinculada">
              {event.taskTitle}
            </Field>
          )}

          <Field icon={<AlignLeft size={18} />} label="Criado em">
            {formatDate(event.createdAt)}
          </Field>
        </div>
      </div>
    </Modal>
  );
};
