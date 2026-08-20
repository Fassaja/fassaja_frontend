import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Task } from '@/types/task';
import { tasksService } from '@/services/tasksService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { useCelebration } from './CelebrationContext';
import { useUser, computeStreak } from './UserContext';
import { useAuth } from './AuthContext';
import { isToday, todayISO, toISODate } from '@/utils/date';
import { detectMilestone } from '@/utils/milestones';
import { deriveTaskStatus } from '@/utils/taskStatus';
import { MAX_SUBTASKS } from '@/utils/subtasks';

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>;
  completeTask: (id: string) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;
  assignTask: (id: string, assigneeIds: string[]) => Promise<Task>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (
    taskId: string,
    subtaskId: string,
    updates: { title?: string; done?: boolean },
  ) => Promise<void>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  reorderSubtasks: (taskId: string, ids: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue>({} as TasksContextValue);

/** Mantém a mesma API de antes — as páginas não mudam. */
export const useTasks = () => useContext(TasksContext);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  /**
   * Espelho do estado CRU, para as ações otimistas guardarem o valor anterior
   * e conseguirem desfazer.
   *
   * Ref, e não a variável de estado: as ações são `useCallback` com lista de
   * dependências curta, e ler `rawTasks` direto capturaria o valor do render
   * em que a função foi criada — desfazendo para um estado velho.
   *
   * Cru e não derivado: o derivado tem `status: 'overdue'` calculado no
   * cliente, e devolvê-lo ao estado gravaria como real um status que o
   * servidor nunca enviou.
   */
  const tasksRef = useRef<Task[]>([]);
  tasksRef.current = rawTasks;
  // Status "overdue" é calculado aqui (fuso local), não vem pronto do servidor.
  const tasks = useMemo(() => rawTasks.map(deriveTaskStatus), [rawTasks]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { celebrate } = useCelebration();
  const { user, recordProductiveDay } = useUser();
  const { isGuest, noteGuestTask } = useAuth();

  const loadTasks = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Visitante: tarefas só do navegador (sandbox local). Autenticado: API.
      const data = isGuest ? guestTasksStore.getAll() : await tasksService.getTasks();
      setRawTasks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isGuest]);

  // Recarrega ao montar e sempre que troca entre visitante/autenticado (login/logout).
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Revalida sem sumir o conteúdo (mantém os dados atuais enquanto atualiza).
  const refresh = useCallback(() => loadTasks(true), [loadTasks]);

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const newTask = isGuest
        ? guestTasksStore.create(task)
        : await tasksService.createTask(task);
      setRawTasks(prev => [...prev, newTask]);
      if (isGuest) noteGuestTask();
      return newTask;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest, noteGuestTask]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const anterior = tasksRef.current.find(t => t.id === id);

    /**
     * Aplica na tela antes da resposta — é este o caminho de arrastar o cartão
     * entre colunas do quadro. Sem isto o cartão voltava para a coluna de
     * origem e só pulava para a certa quando o servidor respondia, o que lê
     * como "não funcionou".
     *
     * Mescla superficial: `updates` é parcial por natureza (só o status, só o
     * prazo), e substituir a tarefa inteira apagaria o resto.
     */
    if (anterior) {
      setRawTasks(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
    }

    try {
      const updated = isGuest
        ? guestTasksStore.update(id, updates)
        : await tasksService.updateTask(id, updates);
      if (updated) {
        setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      }
      return updated;
    } catch (err) {
      if (anterior) setRawTasks(prev => prev.map(t => (t.id === id ? anterior : t)));
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  const completeTask = useCallback(async (id: string) => {
    const anterior = tasksRef.current.find(t => t.id === id);
    const wasCompleted = anterior?.status === 'completed';

    /**
     * Marca na tela ANTES de falar com o servidor.
     *
     * A resposta leva uns 400ms — a distância até a API, que nenhuma
     * otimização de código encurta. Esperar por ela deixava o cartão parado
     * depois do clique, e a pessoa clicava de novo achando que não pegou.
     *
     * `completedAt` provisório para o cartão já riscar e sair da coluna; o
     * valor de verdade chega na resposta e substitui este. Se o servidor
     * recusar, `anterior` volta ao lugar — por isso ele é capturado aqui, e
     * não relido depois, quando o estado já teria mudado.
     */
    if (!wasCompleted && anterior) {
      setRawTasks(prev =>
        prev.map(t =>
          t.id === id ? { ...t, status: 'completed', completedAt: new Date().toISOString() } : t,
        ),
      );
    }

    try {
      const updated = isGuest
        ? guestTasksStore.complete(id)
        : await tasksService.completeTask(id);
      if (updated) {
        setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
        if (!wasCompleted) {
          recordProductiveDay();
          const doneTodayBefore = tasks.filter(
            t => t.status === 'completed' && t.completedAt && isToday(t.completedAt),
          ).length;
          const goal = user.dailyGoal;
          const justHitGoal =
            goal > 0 && doneTodayBefore < goal && doneTodayBefore + 1 >= goal;

          // Marcos raros (projeto 100%, 7 dias de sequência, 10 na semana)
          // têm prioridade sobre a meta diária; senão, comemoração padrão.
          const nextTasks = tasks.map(t => (t.id === id ? updated : t));
          const days = new Set<string>(user.productiveDays);
          nextTasks.forEach(t => {
            if (t.status === 'completed' && t.completedAt) days.add(toISODate(new Date(t.completedAt)));
          });
          days.add(todayISO()); // a conclusão de agora torna hoje produtivo
          const streak = computeStreak(Array.from(days), user.streakDays);

          const milestone = detectMilestone({ tasks: nextTasks, completedTask: updated, streak });
          if (milestone) {
            celebrate(milestone, 'goal');
          } else if (justHitGoal) {
            celebrate('Meta diária batida! 🎯', 'goal');
          } else {
            celebrate();
          }
        }
      }
      return updated;
    } catch (err) {
      // Desfaz o palpite: sem isto o cartão fica riscado para sempre por uma
      // conclusão que o servidor nunca registrou — e a pessoa só descobre ao
      // recarregar a página.
      if (anterior) setRawTasks(prev => prev.map(t => (t.id === id ? anterior : t)));
      setError(err as Error);
      throw err;
    }
  }, [tasks, celebrate, recordProductiveDay, user.dailyGoal, isGuest]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      if (isGuest) guestTasksStore.remove(id);
      else await tasksService.deleteTask(id);
      setRawTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isGuest]);

  const assignTask = useCallback(
    async (id: string, assigneeIds: string[]) => {
      const updated = await tasksService.assignTask(id, assigneeIds);
      setRawTasks(prev => prev.map(t => (t.id === id ? updated : t)));
      return updated;
    },
    [],
  );



  // --- Passos (checklist) -----------------------------------------------------
  //
  // Cada ação devolve a tarefa inteira já atualizada (pela API ou pela sandbox
  // do visitante) e ela substitui a anterior no estado. Isso mantém uma fonte
  // de verdade só: nada aqui recalcula a lista de passos por conta própria.

  /** Substitui a tarefa no estado; `undefined` (tarefa sumiu) não faz nada. */
  const aplicar = useCallback((id: string, atualizada: Task | undefined) => {
    if (!atualizada) return;
    setRawTasks(prev => prev.map(t => (t.id === id ? atualizada : t)));
  }, []);

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const limpo = title.trim();
      if (!limpo) return;
      aplicar(
        taskId,
        isGuest
          ? guestTasksStore.addSubtask(taskId, limpo, MAX_SUBTASKS)
          : await tasksService.addSubtask(taskId, limpo),
      );
    },
    [isGuest, aplicar],
  );

  const updateSubtask = useCallback(
    async (taskId: string, subtaskId: string, updates: { title?: string; done?: boolean }) => {
      aplicar(
        taskId,
        isGuest
          ? guestTasksStore.updateSubtask(taskId, subtaskId, updates)
          : await tasksService.updateSubtask(taskId, subtaskId, updates),
      );
    },
    [isGuest, aplicar],
  );

  const removeSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      aplicar(
        taskId,
        isGuest
          ? guestTasksStore.removeSubtask(taskId, subtaskId)
          : await tasksService.removeSubtask(taskId, subtaskId),
      );
    },
    [isGuest, aplicar],
  );

  const reorderSubtasks = useCallback(
    async (taskId: string, ids: string[]) => {
      aplicar(
        taskId,
        isGuest
          ? guestTasksStore.reorderSubtasks(taskId, ids)
          : await tasksService.reorderSubtasks(taskId, ids),
      );
    },
    [isGuest, aplicar],
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        loading,
        error,
        createTask,
        updateTask,
        completeTask,
        deleteTask,
        assignTask,
        addSubtask,
        updateSubtask,
        removeSubtask,
        reorderSubtasks,
        refresh,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};
