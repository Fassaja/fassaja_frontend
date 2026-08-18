import { api } from './api';

export interface ReminderSettings {
  taskReminder: boolean;
  /** 'HH:MM' no fuso do usuário. */
  taskReminderTime: string;
  /** 0 = no dia do prazo. */
  taskReminderDaysBefore: number;
  timeZone: string | null;
}

/** Fuso IANA deste navegador ('America/Sao_Paulo'). */
export function fusoDoNavegador(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export const reminderService = {
  /**
   * Grava a preferência. O servidor reagenda as tarefas já existentes, então a
   * mudança vale para o que já está lá — e não só para o que vier depois.
   */
  async update(patch: Partial<ReminderSettings>): Promise<ReminderSettings> {
    return api.patch<ReminderSettings>('/tasks/reminder-settings', patch);
  },
};
