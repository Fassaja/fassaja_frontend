import React, { useState } from 'react';
import { AlertTriangle, Check, Clock, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Mascot } from '@/components/mascot/Mascot';
import { useFocus } from '@/contexts/FocusContext';
import { useTasks } from '@/hooks/useTasks';
import { rotuloDeDuracao } from '@/utils/focoCoach';
import { formatDateWithDay, todayISO } from '@/utils/date';

/**
 * O que fazer com o tempo que acabou de ser cronometrado.
 *
 * Aparece assim que a sessão termina, em qualquer tela. É um modal e não um
 * toast de propósito: há uma decisão a tomar — registrar, descartar, concluir
 * a tarefa — e toast some antes de alguém decidir.
 *
 * O padrão é REGISTRAR. Descartar existe porque nem todo tempo cronometrado é
 * tempo trabalhado (quem foi interrompido no meio não quer aquilo no placar),
 * mas é a exceção, e por isso fica discreto, não como um dos botões grandes.
 */
export const SessaoConcluidaModal: React.FC = () => {
  const { concluida, descartar, manter } = useFocus();
  const { tasks, completeTask } = useTasks();
  const [concluindo, setConcluindo] = useState(false);

  if (!concluida) return null;

  const tarefa = tasks.find(t => t.id === concluida.taskId);
  const minutos = Math.max(
    1,
    Math.round(
      (new Date(concluida.endsAt).getTime() - new Date(concluida.startedAt).getTime()) / 60000,
    ),
  );
  const hoje = todayISO();
  // O aviso: dá para concluir mesmo vencida, mas a pessoa precisa saber que
  // está fechando algo em atraso — o número dela vai registrar isso.
  const atrasada = !!tarefa?.dueDate && tarefa.dueDate < hoje && tarefa.status !== 'completed';
  const podeConcluir = !!tarefa && tarefa.status !== 'completed';

  const concluirTarefa = async () => {
    if (!tarefa) return;
    setConcluindo(true);
    try {
      await completeTask(tarefa.id);
      manter();
    } finally {
      setConcluindo(false);
    }
  };

  return (
    <Modal isOpen onClose={manter} title="Sessão concluída" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <Mascot state="celebrate" size="md" animate />

        <div>
          <p className="flex items-center justify-center gap-1.5 text-2xl font-bold text-text-primary">
            <Clock size={20} className="text-primary-vibrant" />
            {rotuloDeDuracao(minutos)}
          </p>
          {tarefa ? (
            <p className="mt-1 text-sm text-text-secondary">
              em <span className="font-semibold text-text-primary">{tarefa.title}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">
              Tempo registrado no seu histórico.
            </p>
          )}
        </div>

        {atrasada && (
          // O aviso pedido: concluir segue liberado, mas com o fato à vista.
          <p className="flex items-start gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-left text-xs text-yellow-800 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-300">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              O prazo era {formatDateWithDay(tarefa!.dueDate!)}. Dá para concluir mesmo assim —
              ela só entra como concluída em atraso.
            </span>
          </p>
        )}

        <div className="flex w-full flex-col gap-2">
          {podeConcluir && (
            <Button
              onClick={concluirTarefa}
              isLoading={concluindo}
              icon={<Check size={17} />}
              className="w-full"
            >
              Concluí a tarefa
            </Button>
          )}
          <Button variant="secondary" onClick={manter} className="w-full">
            {podeConcluir ? 'Continuar depois' : 'Fechar'}
          </Button>
        </div>

        {/* Discreto: é a exceção, não a escolha esperada. */}
        <button
          type="button"
          onClick={descartar}
          className="inline-flex items-center gap-1.5 text-xs text-text-soft transition-colors hover:text-danger"
        >
          <Trash2 size={13} /> Não registrar este tempo
        </button>
      </div>
    </Modal>
  );
};
