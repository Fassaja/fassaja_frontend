import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Task, TaskUpdate } from '@/types/task';
import { aplicarAtualizacao } from '@/utils/taskUpdate';
import { tasksService } from '@/services/tasksService';
import { guestTasksStore } from '@/services/guestTasksStore';
import { useCelebration } from './CelebrationContext';
import { useToast } from './ToastContext';
import { useUser, computeStreak } from './UserContext';
import { useAuth } from './AuthContext';
import { useSessao } from '@/hooks/useSessao';
import { isToday, todayISO, toISODate } from '@/utils/date';
import { detectMilestone } from '@/utils/milestones';
import { deriveTaskStatus } from '@/utils/taskStatus';
import { MAX_SUBTASKS } from '@/utils/subtasks';

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  createTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<Task | undefined>;
  completeTask: (id: string) => Promise<Task | undefined>;
  deleteTask: (id: string) => Promise<void>;
  /**
   * Exclui com "Desfazer": as tarefas somem da tela na hora e o aviso oferece
   * desfazer; o pedido só vai ao servidor quando o aviso fecha sem ele.
   */
  excluirComDesfazer: (ids: string[]) => void;
  assignTask: (id: string, assigneeIds: string[], teamId?: string) => Promise<Task>;
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
  const toast = useToast();
  const { user, recordProductiveDay } = useUser();
  const { isGuest, noteGuestTask } = useAuth();
  // Identidade da sessão: diz de quem é cada resposta que volta (FE-01).
  const { identidade, identidadeAtual, carregar, marcar } = useSessao();

  /** Exclusões esperando o fim da janela do "Desfazer". Ver excluirComDesfazer. */
  const exclusoesPendentes = useRef(new Map<string, { tarefa: Task; indice: number }>());
  /** Último aviso de "concluída": um novo substitui o anterior em vez de empilhar. */
  const ultimoAvisoDeConclusao = useRef<number | null>(null);

  const loadTasks = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      return carregar({
        // Visitante: tarefas só do navegador (sandbox local). Autenticado: API.
        buscar: async () => (isGuest ? guestTasksStore.getAll() : await tasksService.getTasks()),
        aoReceber: data => {
          // O que está na janela do "Desfazer" já saiu da tela; uma
          // atualização vinda do servidor nesse meio-tempo não pode trazer
          // a tarefa de volta.
          setRawTasks(
            exclusoesPendentes.current.size
              ? data.filter(t => !exclusoesPendentes.current.has(t.id))
              : data,
          );
          setError(null);
        },
        aoFalhar: err => setError(err),
        aoTerminar: () => {
          if (!silent) setLoading(false);
        },
      });
    },
    [isGuest, carregar],
  );

  /*
   * Recarrega a cada troca de IDENTIDADE — login, logout, troca de conta,
   * sessão nova na mesma conta.
   *
   * A dependência era só `isGuest`. Ir da conta A para a B não muda esse
   * booleano: o efeito não rodava e a lista de A ficava na tela da B (FE-01).
   * A limpeza vem antes da carga — o dado da conta anterior não pode esperar
   * resposta de rede para sumir, nem sobreviver se a API falhar.
   */
  useEffect(() => {
    setRawTasks([]);
    tasksRef.current = [];
    setError(null);
    loadTasks();
  }, [identidade, loadTasks]);

  // Revalida sem sumir o conteúdo (mantém os dados atuais enquanto atualiza).
  const refresh = useCallback(() => loadTasks(true), [loadTasks]);

  const createTask = useCallback(
    async (task: Omit<Task, 'id' | 'createdAt'>) => {
      const aplicar = marcar();
      try {
        const newTask = isGuest
          ? guestTasksStore.create(task)
          : await tasksService.createTask(task);
        // A resposta de uma mutação é dado de conta como qualquer outro: se a
        // sessão trocou no caminho, ela não entra na tela de quem está agora.
        aplicar(() => {
          setRawTasks(prev => [...prev, newTask]);
          if (isGuest) noteGuestTask();
        });
        return newTask;
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [isGuest, noteGuestTask, marcar],
  );

  const updateTask = useCallback(async (id: string, updates: TaskUpdate) => {
    const aplicar = marcar();
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
      setRawTasks(prev => prev.map(t => (t.id === id ? aplicarAtualizacao(t, updates) : t)));
    }

    try {
      const updated = isGuest
        ? guestTasksStore.update(id, updates)
        : await tasksService.updateTask(id, updates);
      if (updated) {
        aplicar(() => setRawTasks(prev => prev.map(t => (t.id === id ? updated : t))));
      }
      return updated;
    } catch (err) {
      // O desfazimento carrega uma CÓPIA do estado da sessão anterior: aplicá-lo
      // depois de uma troca de conta ressuscitaria a tarefa de A dentro da
      // sessão de B. Um AbortController não cobriria este caminho — aqui o
      // callback já resolveu (FE-01).
      aplicar(() => {
        if (anterior) setRawTasks(prev => prev.map(t => (t.id === id ? anterior : t)));
        setError(err as Error);
      });
      throw err;
    }
  }, [isGuest, marcar]);

  // O "Desfazer" da conclusão chama updateTask; pela ref, para a lista de
  // dependências de completeTask não crescer a cada mudança de updateTask.
  const updateTaskRef = useRef(updateTask);
  updateTaskRef.current = updateTask;

  const completeTask = useCallback(async (id: string) => {
    const aplicar = marcar();
    const marca = identidadeAtual();
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
      // A conclusão só vale para quem a pediu: se a sessão trocou enquanto o
      // servidor respondia, nem o estado nem a comemoração/XP pertencem a
      // quem está na tela agora (FE-01).
      if (identidadeAtual() !== marca) return updated;
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

          // "Desfazer" devolve o status que a tarefa tinha antes do clique.
          // É o mesmo caminho de trocar o status na mão, então nada fica
          // diferente de quem desmarcasse pelo seletor.
          const statusAnterior = anterior?.status;
          if (statusAnterior && statusAnterior !== 'completed') {
            if (ultimoAvisoDeConclusao.current !== null) toast.dismiss(ultimoAvisoDeConclusao.current);
            ultimoAvisoDeConclusao.current = toast.comAcao('Tarefa concluída.', {
              rotulo: 'Desfazer',
              onClick: () => {
                updateTaskRef.current(id, { status: statusAnterior }).catch(() =>
                  toast.error('Não foi possível desfazer. Tente mudar o status na tarefa.'),
                );
              },
            });
          }
        }
      }
      return updated;
    } catch (err) {
      // Desfaz o palpite: sem isto o cartão fica riscado para sempre por uma
      // conclusão que o servidor nunca registrou — e a pessoa só descobre ao
      // recarregar a página. Só que o desfazimento vale para a sessão que fez
      // o palpite; noutra, seria dado de conta alheia.
      aplicar(() => {
        if (anterior) setRawTasks(prev => prev.map(t => (t.id === id ? anterior : t)));
        setError(err as Error);
      });
      throw err;
    }
    // productiveDays/streakDays entram na lista porque a comemoração LÊ os dois
    // para calcular a sequência: fora dela, o cálculo usaria o valor do render
    // em que a função nasceu.
  }, [
    tasks,
    celebrate,
    recordProductiveDay,
    user.dailyGoal,
    user.productiveDays,
    user.streakDays,
    isGuest,
    marcar,
    identidadeAtual,
    toast,
  ]);

  const deleteTask = useCallback(
    async (id: string) => {
      const aplicar = marcar();
      try {
        if (isGuest) guestTasksStore.remove(id);
        else await tasksService.deleteTask(id);
        aplicar(() => setRawTasks(prev => prev.filter(t => t.id !== id)));
      } catch (err) {
        aplicar(() => setError(err as Error));
        throw err;
      }
    },
    [isGuest, marcar],
  );

  const excluirComDesfazer = useCallback(
    (ids: string[]) => {
      const marca = identidadeAtual();
      const atual = tasksRef.current;
      const alvo = ids
        .map(id => ({ tarefa: atual.find(t => t.id === id), indice: atual.findIndex(t => t.id === id) }))
        .filter((x): x is { tarefa: Task; indice: number } => !!x.tarefa);
      if (alvo.length === 0) return;

      setRawTasks(prev => prev.filter(t => !ids.includes(t.id)));
      for (const p of alvo) exclusoesPendentes.current.set(p.tarefa.id, p);

      /** Tira da fila só o que ainda está nela (a saída da página pode ter levado). */
      const retirar = () =>
        alvo.filter(({ tarefa }) => exclusoesPendentes.current.delete(tarefa.id));

      toast.comAcao(alvo.length === 1 ? 'Tarefa excluída.' : `${alvo.length} tarefas excluídas.`, {
        rotulo: 'Desfazer',
        onClick: () => {
          const devolver = retirar();
          if (devolver.length === 0 || identidadeAtual() !== marca) return;
          // De volta ao lugar de onde saiu, e não ao fim da lista.
          setRawTasks(prev => {
            const proxima = [...prev];
            for (const { tarefa, indice } of devolver.sort((x, y) => x.indice - y.indice)) {
              proxima.splice(Math.min(indice, proxima.length), 0, tarefa);
            }
            return proxima;
          });
        },
        // O aviso fechou sem "Desfazer": agora sim vai ao servidor.
        aoExpirar: () => {
          for (const { tarefa } of retirar()) {
            void (async () => {
              try {
                if (isGuest) guestTasksStore.remove(tarefa.id);
                else await tasksService.deleteTask(tarefa.id);
              } catch {
                // O servidor recusou: a tarefa volta, e a pessoa fica sabendo.
                if (identidadeAtual() !== marca) return;
                setRawTasks(prev => (prev.some(t => t.id === tarefa.id) ? prev : [...prev, tarefa]));
                toast.error(`Não foi possível excluir "${tarefa.title}".`);
              }
            })();
          }
        },
      });
    },
    [isGuest, identidadeAtual, toast],
  );

  /*
   * Fechou a aba com exclusões ainda na janela do "Desfazer": elas valem. O
   * pedido vai com `keepalive`, que o navegador termina mesmo com a página
   * indo embora.
   */
  useEffect(() => {
    const aoSair = () => {
      for (const id of exclusoesPendentes.current.keys()) {
        if (isGuest) guestTasksStore.remove(id);
        else tasksService.deleteTaskAoSair(id);
      }
      exclusoesPendentes.current.clear();
    };
    window.addEventListener('pagehide', aoSair);
    return () => window.removeEventListener('pagehide', aoSair);
  }, [isGuest]);

  const assignTask = useCallback(
    async (id: string, assigneeIds: string[], teamId?: string) => {
      const aplicar = marcar();
      const updated = await tasksService.assignTask(id, assigneeIds, teamId);
      aplicar(() => setRawTasks(prev => prev.map(t => (t.id === id ? updated : t))));
      return updated;
    },
    [marcar],
  );



  // --- Passos (checklist) -----------------------------------------------------
  //
  // Cada ação devolve a tarefa inteira já atualizada (pela API ou pela sandbox
  // do visitante) e ela substitui a anterior no estado. Isso mantém uma fonte
  // de verdade só: nada aqui recalcula a lista de passos por conta própria.

  /**
   * Substitui a tarefa no estado; `undefined` (tarefa sumiu) não faz nada.
   *
   * `marca` é a identidade de quem PEDIU a mudança: a resposta que chega depois
   * de uma troca de sessão é descartada em vez de virar estado (FE-01).
   */
  const aplicarNaTarefa = useCallback(
    (id: string, atualizada: Task | undefined, marca: (efeito: () => void) => void) => {
      if (!atualizada) return;
      marca(() => setRawTasks(prev => prev.map(t => (t.id === id ? atualizada : t))));
    },
    [],
  );

  const addSubtask = useCallback(
    async (taskId: string, title: string) => {
      const limpo = title.trim();
      if (!limpo) return;
      const aplicar = marcar();
      aplicarNaTarefa(
        taskId,
        isGuest
          ? guestTasksStore.addSubtask(taskId, limpo, MAX_SUBTASKS)
          : await tasksService.addSubtask(taskId, limpo),
        aplicar,
      );
    },
    [isGuest, aplicarNaTarefa, marcar],
  );

  const updateSubtask = useCallback(
    async (taskId: string, subtaskId: string, updates: { title?: string; done?: boolean }) => {
      const aplicar = marcar();
      aplicarNaTarefa(
        taskId,
        isGuest
          ? guestTasksStore.updateSubtask(taskId, subtaskId, updates)
          : await tasksService.updateSubtask(taskId, subtaskId, updates),
        aplicar,
      );
    },
    [isGuest, aplicarNaTarefa, marcar],
  );

  const removeSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      const aplicar = marcar();
      aplicarNaTarefa(
        taskId,
        isGuest
          ? guestTasksStore.removeSubtask(taskId, subtaskId)
          : await tasksService.removeSubtask(taskId, subtaskId),
        aplicar,
      );
    },
    [isGuest, aplicarNaTarefa, marcar],
  );

  const reorderSubtasks = useCallback(
    async (taskId: string, ids: string[]) => {
      const aplicar = marcar();
      aplicarNaTarefa(
        taskId,
        isGuest
          ? guestTasksStore.reorderSubtasks(taskId, ids)
          : await tasksService.reorderSubtasks(taskId, ids),
        aplicar,
      );
    },
    [isGuest, aplicarNaTarefa, marcar],
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
        excluirComDesfazer,
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
