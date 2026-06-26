import React, { useMemo, useState } from 'react';
import { Plus, Clock, MapPin, Link2, Bell } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { Mascot } from '@/components/mascot/Mascot';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { AgendaMonth } from '@/components/agenda/AgendaMonth';
import { EventModal } from '@/components/agenda/EventModal';
import { AgendaNotificationBanner } from '@/components/agenda/AgendaNotificationBanner';
import { useEvents } from '@/contexts/EventsContext';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { CalendarEvent } from '@/types/event';
import { reminderLabel } from '@/utils/eventReminders';
import { toISODate } from '@/utils/date';

// Ordena: dia inteiro primeiro, depois por horário de início.
function byTime(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return (a.startTime ?? '').localeCompare(b.startTime ?? '');
}

function timeLabel(e: CalendarEvent): string {
  if (e.allDay) return 'Dia inteiro';
  if (e.startTime && e.endTime) return `${e.startTime} – ${e.endTime}`;
  if (e.startTime) return e.startTime;
  return 'Sem horário';
}

const AgendaPage: React.FC = () => {
  const { events, loading } = useEvents();
  const showSkeleton = useDeferredLoading(loading);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const selectedISO = toISODate(selectedDate);
  const dayEvents = useMemo(
    () => events.filter(e => e.date === selectedISO).sort(byTime),
    [events, selectedISO],
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setModalOpen(true);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  return (
    <AppLayout
      title="Agenda"
      subtitle="Seus compromissos com data e horário — separados das tarefas."
      onNewTask={openCreate}
      actionLabel="Novo evento"
    >
      {loading ? (
        showSkeleton ? <LoadingScreen /> : null
      ) : (
        <>
        <AgendaNotificationBanner />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AgendaMonth
              date={currentDate}
              onDateChange={setCurrentDate}
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </div>

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
                    {dayEvents.length === 0
                      ? 'Nenhum evento nesta data'
                      : `${dayEvents.length} evento${dayEvents.length === 1 ? '' : 's'} nesta data`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToday}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-vibrant bg-primary-light hover:brightness-95 active:scale-95 transition-all"
                >
                  Hoje
                </button>
              </div>

              {dayEvents.length > 0 ? (
                <ul className="space-y-2.5">
                  {dayEvents.map(e => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="w-full text-left flex items-stretch gap-3 p-3 rounded-xl border border-border hover:border-primary-vibrant/50 hover:bg-bg-secondary/60 transition-all"
                      >
                        <span
                          className="w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: e.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary truncate">{e.title}</p>
                          <p className="inline-flex items-center gap-1.5 text-xs text-text-secondary mt-1">
                            <Clock size={12} /> {timeLabel(e)}
                          </p>
                          {e.location && (
                            <p className="inline-flex items-center gap-1.5 text-xs text-text-secondary mt-1 ml-0 w-full truncate">
                              <MapPin size={12} className="shrink-0" />
                              <span className="truncate">{e.location}</span>
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {e.reminderMinutes !== null && e.reminderMinutes !== undefined && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary">
                                <Bell size={11} /> {reminderLabel(e.reminderMinutes)}
                              </span>
                            )}
                            {e.taskTitle && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-light text-primary-vibrant">
                                <Link2 size={11} /> {e.taskTitle}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center text-center py-6">
                  <Mascot state="celebrate" size="sm" animate />
                  <p className="text-text-primary font-semibold mt-3">Dia livre!</p>
                  <p className="text-text-secondary text-sm mb-4">Nenhum evento para esta data.</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-vibrant hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    <Plus size={16} /> Novo evento
                  </button>
                </div>
              )}
            </Card>
          </div>
        </div>
        </>
      )}

      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={editing}
        defaultDate={selectedISO}
      />
    </AppLayout>
  );
};

export default AgendaPage;
