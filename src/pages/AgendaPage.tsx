import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Clock, MapPin, Link2, Bell } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageTour } from '@/components/onboarding/PageTour';
import { DayPanel } from '@/components/common/DayPanel';
import { Mascot } from '@/components/mascot/Mascot';
import { CalendarSkeleton } from '@/components/common/Skeletons';
import { SlidingHighlight } from '@/components/common/SlidingHighlight';
import { AgendaMonth } from '@/components/agenda/AgendaMonth';
import { AgendaTimeline, TimelineView } from '@/components/agenda/AgendaTimeline';
import { EventModal } from '@/components/agenda/EventModal';
import { EventDetailModal } from '@/components/agenda/EventDetailModal';
import { AgendaNotificationBanner } from '@/components/agenda/AgendaNotificationBanner';
import { useEvents } from '@/contexts/EventsContext';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { CalendarEvent } from '@/types/event';
import { reminderLabel } from '@/utils/eventReminders';
import { toISODate } from '@/utils/date';
import { toExternalHref } from '@/utils/url';

type AgendaView = 'month' | TimelineView;

const VIEWS: { value: AgendaView; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Dia' },
];

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

  /**
   * `?date=AAAA-MM-DD` abre a Agenda naquele dia — é assim que um evento
   * achado na busca rápida (⌘K / Ctrl+K) leva ao dia dele, e não ao de hoje.
   *
   * Só o valor inicial: depois disso quem manda é a navegação da própria tela.
   * Data inválida cai em hoje, que é o padrão de sempre.
   */
  const [searchParams] = useSearchParams();
  const dataInicial = () => {
    const pedida = searchParams.get('date');
    if (!pedida) return new Date();
    const [a, m, d] = pedida.split('-').map(Number);
    if (!a || !m || !d) return new Date();
    const data = new Date(a, m - 1, d);
    return Number.isNaN(data.getTime()) ? new Date() : data;
  };

  const [currentDate, setCurrentDate] = useState(dataInicial);
  const [selectedDate, setSelectedDate] = useState(dataInicial);
  // Semana é o padrão: a Agenda existe para horários, e é a visão em que o
  // horário aparece. O mês continua a um clique, para quem quer o panorama.
  const [view, setView] = useState<AgendaView>('week');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [createTime, setCreateTime] = useState<string | undefined>();
  const [createDate, setCreateDate] = useState<string | undefined>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<CalendarEvent | null>(null);

  const selectedISO = toISODate(selectedDate);
  const dayEvents = useMemo(
    () => events.filter(e => e.date === selectedISO).sort(byTime),
    [events, selectedISO],
  );

  const openCreate = () => {
    setEditing(null);
    setCreateDate(undefined);
    setCreateTime(undefined);
    setModalOpen(true);
  };

  // Clique numa faixa vazia da timeline: já abre o formulário naquele horário.
  const openCreateAt = (iso: string, startTime: string) => {
    setEditing(null);
    setCreateDate(iso);
    setCreateTime(startTime);
    setModalOpen(true);
  };

  // Clique no evento abre a visualização; o "Editar" de lá abre o form.
  const openDetail = (event: CalendarEvent) => {
    setViewing(event);
    setDetailOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setDetailOpen(false);
    setEditing(event);
    setModalOpen(true);
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  // Na timeline, mover o dia selecionado é o que move a semana exibida.
  const selectDate = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
  };

  return (
    <AppLayout
      title="Agenda"
      subtitle="Seus compromissos com data e horário — separados das tarefas."
      onNewTask={openCreate}
      actionLabel="Novo evento"
    >
      <PageTour id="agenda" />
      {loading ? (
        showSkeleton ? <CalendarSkeleton /> : null
      ) : (
        <>
        <AgendaNotificationBanner />

        {/* Alternador de visão */}
        <div className="mb-4 flex items-center gap-1 p-1 rounded-xl bg-bg-secondary border border-border w-fit">
          {VIEWS.map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              aria-pressed={view === v.value}
              className={`relative px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                view === v.value
                  ? 'text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {view === v.value && <SlidingHighlight groupId="agenda-view" />}
              <span className="relative z-10">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {view === 'month' ? (
              <AgendaMonth
                date={currentDate}
                onDateChange={setCurrentDate}
                events={events}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            ) : (
              <AgendaTimeline
                view={view}
                date={selectedDate}
                events={events}
                onSelectDate={selectDate}
                onOpenEvent={openDetail}
                onCreateAt={openCreateAt}
              />
            )}
          </div>

          <div>
            <DayPanel
              date={selectedDate}
              count={dayEvents.length}
              noun="evento"
              onToday={goToday}
              empty={
                <div className="flex flex-col items-center text-center py-6">
                  <Mascot state="happy" size="sm" animate />
                  <p className="text-text-primary font-semibold mt-3">Nada marcado</p>
                  <p className="text-text-secondary text-sm mb-4">
                    Nenhum compromisso para esta data.
                  </p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-vibrant hover:bg-primary-hover active:scale-95 transition-all"
                  >
                    <Plus size={16} /> Novo evento
                  </button>
                </div>
              }
            >
              <ul className="space-y-2.5">
                {dayEvents.map(e => (
                  <li key={e.id} className="relative">
                    <div className="flex items-stretch gap-3 p-3 rounded-xl border border-border hover:border-primary-vibrant/50 hover:bg-bg-secondary/60 transition-all">
                      {/* Clicar no card abre a visualização do evento (overlay). */}
                      <button
                        type="button"
                        onClick={() => openDetail(e)}
                        aria-label={`Ver ${e.title}`}
                        className="absolute inset-0 rounded-xl"
                      />
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
                        {e.link && (
                          <a
                            href={toExternalHref(e.link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={ev => ev.stopPropagation()}
                            className="relative z-10 inline-flex items-center gap-1.5 text-xs text-primary-vibrant mt-1 ml-0 max-w-full truncate hover:underline"
                          >
                            <Link2 size={12} className="shrink-0" />
                            <span className="truncate">{e.link}</span>
                          </a>
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
                    </div>
                  </li>
                ))}
              </ul>
            </DayPanel>
          </div>
        </div>
        </>
      )}

      <EventDetailModal
        isOpen={detailOpen}
        event={viewing}
        onClose={() => setDetailOpen(false)}
        onEdit={openEdit}
      />

      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        event={editing}
        defaultDate={createDate ?? selectedISO}
        defaultStartTime={createTime}
      />
    </AppLayout>
  );
};

export default AgendaPage;
