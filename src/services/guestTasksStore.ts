import { Task } from '@/types/task';

// Sandbox local do visitante: tarefas vivem só no navegador (não tocam o backend).
// Isolamento total — visitante nunca vê dados de ninguém.
const STORE_KEY = 'fassaja_guest_tasks_data';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Aplica a regra de "atrasada" em tempo de leitura, igual ao backend.
function withDerivedStatus(task: Task): Task {
  if (task.status !== 'completed' && task.dueDate && task.dueDate < todayISO()) {
    return { ...task, status: 'overdue' };
  }
  return task;
}

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
    return readRaw().map(withDerivedStatus);
  },

  create(input: Omit<Task, 'id' | 'createdAt'>): Task {
    const task: Task = {
      ...input,
      id: newId(),
      createdAt: new Date().toISOString(),
      completedAt: input.status === 'completed' ? new Date().toISOString() : undefined,
    };
    write([...readRaw(), task]);
    return withDerivedStatus(task);
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
    return withDerivedStatus(merged);
  },

  complete(id: string): Task | undefined {
    return this.update(id, { status: 'completed' });
  },

  remove(id: string): void {
    write(readRaw().filter(t => t.id !== id));
  },
};
