import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, Check, ListChecks } from 'lucide-react';
import { Task } from '@/types/task';
import { useTasks } from '@/contexts/TasksContext';
import { useToast } from '@/contexts/ToastContext';
import { MAX_SUBTASKS, subtaskProgress } from '@/utils/subtasks';

/**
 * Checklist da tarefa.
 *
 * Marcar um passo NÃO conclui a tarefa, mesmo quando é o último. Concluir dá
 * XP, alimenta a sequência e some da lista em quatro dias — grande demais para
 * acontecer de repente porque alguém marcou uma caixinha. Quando todos ficam
 * prontos aparece um convite explícito, e quem decide é a pessoa.
 */
export const SubtaskList: React.FC<{ task: Task }> = ({ task }) => {
  const { addSubtask, updateSubtask, removeSubtask, completeTask } = useTasks();
  const toast = useToast();
  const [novo, setNovo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const passos = task.subtasks ?? [];
  const { feitos, total, percentual, completo } = subtaskProgress(passos);
  const cheio = total >= MAX_SUBTASKS;
  const tarefaConcluida = task.status === 'completed';

  const adicionar = async (e: React.FormEvent) => {
    e.preventDefault();
    const titulo = novo.trim();
    if (!titulo || ocupado || cheio) return;
    setOcupado(true);
    // Limpa ANTES de esperar a resposta: quem está listando passos digita um
    // atrás do outro, e o campo travado por meio segundo a cada item quebra o
    // ritmo. Se falhar, o texto volta.
    setNovo('');
    try {
      await addSubtask(task.id, titulo);
    } catch {
      setNovo(titulo);
      toast.error('Não foi possível adicionar o passo.');
    } finally {
      setOcupado(false);
    }
  };

  const alternar = async (id: string, done: boolean) => {
    try {
      await updateSubtask(task.id, id, { done });
    } catch {
      toast.error('Não foi possível atualizar o passo.');
    }
  };

  const excluir = async (id: string) => {
    try {
      await removeSubtask(task.id, id);
    } catch {
      toast.error('Não foi possível excluir o passo.');
    }
  };

  return (
    <section className="mt-4 rounded-2xl border border-border p-4">
      <header className="flex items-center gap-2">
        <ListChecks size={18} className="shrink-0 text-text-soft" />
        <h4 className="flex-1 text-sm font-bold text-text-primary">Passos</h4>
        {total > 0 && (
          <span className="text-xs font-bold text-text-secondary tabular-nums">
            {feitos}/{total}
          </span>
        )}
      </header>

      {total > 0 && (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary"
          role="progressbar"
          aria-valuenow={percentual}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${feitos} de ${total} passos concluídos`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              completo ? 'bg-success' : 'bg-primary-vibrant'
            }`}
            style={{ width: `${percentual}%` }}
          />
        </div>
      )}

      <ul className="mt-3 space-y-0.5">
        <AnimatePresence initial={false}>
          {passos.map(passo => (
            <motion.li
              key={passo.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="group flex items-center gap-2.5 rounded-lg py-1.5 pl-1 pr-1 hover:bg-bg-secondary/60"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={passo.done}
                onClick={() => alternar(passo.id, !passo.done)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  passo.done
                    ? 'border-success bg-success text-white'
                    : 'border-border hover:border-primary-vibrant'
                }`}
              >
                {passo.done && <Check size={13} strokeWidth={3} />}
              </button>
              <span
                className={`min-w-0 flex-1 break-words text-sm ${
                  passo.done ? 'text-text-soft line-through' : 'text-text-primary'
                }`}
              >
                {passo.title}
              </span>
              {/* Visível no toque, revelado no hover só onde há ponteiro — no
                  celular um botão que só aparece no hover é inalcançável. */}
              <button
                type="button"
                onClick={() => excluir(passo.id)}
                aria-label={`Excluir passo ${passo.title}`}
                className="shrink-0 rounded-md p-1 text-text-soft opacity-100 transition-opacity hover:text-danger sm:opacity-0 sm:group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {total === 0 && (
        <p className="mt-2 text-sm text-text-soft">
          Quebre esta tarefa nos passos que ela realmente exige.
        </p>
      )}

      {!tarefaConcluida && (
        <form onSubmit={adicionar} className="mt-3 flex items-center gap-2">
          <input
            value={novo}
            onChange={e => setNovo(e.target.value)}
            disabled={cheio}
            maxLength={120}
            placeholder={cheio ? `Limite de ${MAX_SUBTASKS} passos` : 'Adicionar um passo...'}
            aria-label="Novo passo"
            className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-text-primary placeholder-text-soft transition-shadow focus:border-primary-vibrant focus:outline-none focus:ring-4 focus:ring-primary-light/60 disabled:bg-bg-secondary"
          />
          <button
            type="submit"
            disabled={!novo.trim() || cheio}
            aria-label="Adicionar passo"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-vibrant text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <Plus size={17} />
          </button>
        </form>
      )}

      {completo && !tarefaConcluida && (
        <button
          type="button"
          onClick={() => completeTask(task.id)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 py-2 text-sm font-semibold text-success transition-colors hover:bg-success/20"
        >
          <Check size={16} /> Todos os passos prontos — concluir a tarefa
        </button>
      )}
    </section>
  );
};
