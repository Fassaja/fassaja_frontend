import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CalendarEvent, EventInput } from '@/types/event';
import { eventsService } from '@/services/eventsService';
import { useAuth } from './AuthContext';

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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (silent = false) => {
      // A agenda é só para contas (igual ao Calendário). Visitante não carrega.
      if (status !== 'authed') {
        setEvents([]);
        setLoading(false);
        return;
      }
      try {
        if (!silent) setLoading(true);
        setEvents(await eventsService.list());
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const createEvent = useCallback(async (input: EventInput) => {
    const created = await eventsService.create(input);
    setEvents(prev => [...prev, created]);
    return created;
  }, []);

  const updateEvent = useCallback(async (id: string, input: Partial<EventInput>) => {
    const updated = await eventsService.update(id, input);
    setEvents(prev => prev.map(e => (e.id === id ? updated : e)));
    return updated;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await eventsService.remove(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <EventsContext.Provider
      value={{ events, loading, error, createEvent, updateEvent, deleteEvent, refresh }}
    >
      {children}
    </EventsContext.Provider>
  );
};
