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

  // --- Passos (checklist) ---------------------------------------------------
  // O visitante precisa dos passos como qualquer outro: sem isto o checklist
  // simplesmente não existiria para quem ainda não tem conta — justamente quem
  // está decidindo se cria uma.

  addSubtask(taskId: string, title: string, max: number): Task | undefined {
    const tasks = readRaw();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return undefined;
    const passos = t.subtasks ?? [];
    if (passos.length >= max) return t;
    t.subtasks = [...passos, { id: newId(), title: title.trim(), done: false }];
    write(tasks);
    return t;
  },

  updateSubtask(
    taskId: string,
    subtaskId: string,
    updates: { title?: string; done?: boolean },
  ): Task | undefined {
    const tasks = readRaw();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return undefined;
    t.subtasks = (t.subtasks ?? []).map(p =>
      p.id === subtaskId
        ? {
            ...p,
            ...(updates.title !== undefined ? { title: updates.title.trim() } : {}),
            ...(updates.done !== undefined ? { done: updates.done } : {}),
          }
        : p,
    );
    write(tasks);
    return t;
  },

  removeSubtask(taskId: string, subtaskId: string): Task | undefined {
    const tasks = readRaw();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return undefined;
    t.subtasks = (t.subtasks ?? []).filter(p => p.id !== subtaskId);
    write(tasks);
    return t;
  },

  /** Ids desconhecidos são ignorados, e os que faltarem vão para o fim —
   *  a lista nunca perde um passo por causa de uma tela defasada. */
  reorderSubtasks(taskId: string, ids: string[]): Task | undefined {
    const tasks = readRaw();
    const t = tasks.find(x => x.id === taskId);
    if (!t) return undefined;
    const atuais = t.subtasks ?? [];
    const porId = new Map(atuais.map(p => [p.id, p]));
    const ordenados = ids.map(id => porId.get(id)).filter((p): p is NonNullable<typeof p> => !!p);
    const restantes = atuais.filter(p => !ids.includes(p.id));
    t.subtasks = [...ordenados, ...restantes];
    write(tasks);
    return t;
  },

  clear(): void {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch {
      // localStorage indisponível
    }
  },
};
