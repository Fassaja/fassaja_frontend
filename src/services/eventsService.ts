import { CalendarEvent, EventInput } from '@/types/event';
import { api } from './api';

interface ListParams {
  from?: string; // 'YYYY-MM-DD' — limite inferior (inclusivo)
  to?: string; // 'YYYY-MM-DD' — limite superior (inclusivo)
}

export const eventsService = {
  list(params: ListParams = {}): Promise<CalendarEvent[]> {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return api.get<CalendarEvent[]>(`/events${qs ? `?${qs}` : ''}`);
  },

  create(input: EventInput): Promise<CalendarEvent> {
    return api.post<CalendarEvent>('/events', input);
  },

  update(id: string, input: Partial<EventInput>): Promise<CalendarEvent> {
    return api.patch<CalendarEvent>(`/events/${id}`, input);
  },

  async remove(id: string): Promise<void> {
    await api.delete<void>(`/events/${id}`);
  },
};
