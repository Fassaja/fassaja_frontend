// Evento da Agenda pessoal (separado das tarefas; estilo Google Calendar).
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // 'YYYY-MM-DD'
  startTime?: string; // 'HH:MM'
  endTime?: string; // 'HH:MM'
  allDay: boolean;
  color: string;
  location?: string;
  reminderMinutes?: number | null; // lembrete: minutos antes do início (null = sem)
  taskId?: string; // vínculo opcional a uma tarefa
  taskTitle?: string; // título da tarefa vinculada (somente leitura)
  createdAt: string;
}

// Campos enviados ao criar/editar (sem os derivados/somente-leitura).
export type EventInput = {
  title: string;
  description?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  allDay: boolean;
  color: string;
  location?: string;
  reminderMinutes?: number | null;
  taskId?: string | null;
};
