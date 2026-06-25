import { Task } from '@/types/task';

// Sandbox local do visitante: tarefas vivem só no navegador (não tocam o backend).
// Isolamento total — visitante nunca vê dados de ninguém.
// O status "atrasada" é derivado no TasksContext (fuso local), não aqui.
const STORE_KEY = 'fassaja_guest_tasks_data';

function readRaw(): Task[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

function write(tasks: Task[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(tasks));
  } catch {
    // localStorage indisponível
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export const guestTasksStore = {
  getAll(): Task[] {
    return readRaw();
  },

  create(input: Omit<Task, 'id' | 'createdAt'>): Task {
    const task: Task = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      completedAt: input.status === 'completed' ? new Date().toISOString() : undefined,
    };
    write([...readRaw(), task]);
    return task;
  },

  update(id: string, updates: Partial<Task>): Task | undefined {
    const tasks = readRaw();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    let completedAt = tasks[idx].completedAt;
    if (updates.status === 'completed') completedAt = new Date().toISOString();
    else if (updates.status) completedAt = undefined;
    const merged: Task = { ...tasks[idx], ...updates, completedAt };
    tasks[idx] = merged;
    write(tasks);
    return merged;
  },

  complete(id: string): Task | undefined {
    return this.update(id, { status: 'completed' });
  },

  remove(id: string): void {
    write(readRaw().filter(t => t.id !== id));
  },

  clear(): void {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      // localStorage indisponível
    }
  },
};
