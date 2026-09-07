import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CalendarEvent, EventInput } from '@/types/event';
import { eventsService } from '@/services/eventsService';
import { useAuth } from './AuthContext';
import { useSessao } from '@/hooks/useSessao';

interface EventsContextValue {
  events: CalendarEvent[];
  loading: boolean;
  error: Error | null;
  createEvent: (input: EventInput) => Promise<CalendarEvent>;
  updateEvent: (id: string, input: Partial<EventInput>) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue>({} as EventsContextValue);

export const useEvents = () => useContext(EventsContext);

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status } = useAuth();
  const { identidade, carregar, marcar } = useSessao();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    (silent = false) => {
      // A agenda é só para contas (igual ao Calendário). Visitante não carrega.
      if (status !== 'authed') {
        setEvents([]);
        setLoading(false);
        return Promise.resolve();
      }
      if (!silent) setLoading(true);
      return carregar({
        buscar: () => eventsService.list(),
        aoReceber: dados => {
          setEvents(dados);
          setError(null);
        },
        aoFalhar: err => setError(err),
        aoTerminar: () => {
          if (!silent) setLoading(false);
        },
      });
    },
    [status, carregar],
  );

  // Por identidade, não por `status`: ver ProjectsContext (FE-01).
  useEffect(() => {
    setEvents([]);
    setError(null);
    load();
  }, [identidade, load]);

  const refresh = useCallback(() => load(true), [load]);

  const createEvent = useCallback(
    async (input: EventInput) => {
      const aplicar = marcar();
      const created = await eventsService.create(input);
      aplicar(() => setEvents(prev => [...prev, created]));
      return created;
    },
    [marcar],
  );

  const updateEvent = useCallback(
    async (id: string, input: Partial<EventInput>) => {
      const aplicar = marcar();
      const updated = await eventsService.update(id, input);
      aplicar(() => setEvents(prev => prev.map(e => (e.id === id ? updated : e))));
      return updated;
    },
    [marcar],
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const aplicar = marcar();
      await eventsService.remove(id);
      aplicar(() => setEvents(prev => prev.filter(e => e.id !== id)));
    },
    [marcar],
  );

  return (
    <EventsContext.Provider
      value={{ events, loading, error, createEvent, updateEvent, deleteEvent, refresh }}
    >
      {children}
    </EventsContext.Provider>
  );
};
