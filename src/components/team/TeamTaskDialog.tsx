import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal';
import { AssigneeSelector } from '@/components/tasks/AssigneeSelector';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useToast } from '@/contexts/ToastContext';
import { Task } from '@/types/task';
import { TeamMember } from '@/types/team';

interface Props {
  task: Task | null;
  members: TeamMember[];
  teamId: string;
  /** Quem distribui trabalho pode trocar os responsáveis; os demais só leem. */
  podeGerenciar: boolean;
  onClose: () => void;
  /** Devolve a tarefa depois de qualquer alteração, para o painel se atualizar. */
  onAlterada: (task: Task) => void;
}

/**
 * A tarefa da equipe, aberta DENTRO da área de Equipe.
 *
 * Antes, clicar num card levava para `/tasks?…&task=<id>`: a pessoa era
 * expulsa do painel do time, perdia o contexto de quem carrega o quê e só
 * voltava pelo botão do navegador. Numa tela cujo trabalho é comparar e
 * redistribuir, sair da tela a cada olhada é o fim da comparação.
 *
 * E o segundo buraco, que este componente fecha junto: a área existe para
 * DISTRIBUIR trabalho, mas "dar esta tarefa ao Neto" exigia sair para outra
 * tela. Ver que algo está sem responsável e não poder resolver ali é o mesmo
 * beco sem saída da carga por pessoa, agora na tarefa.
 *
 * Os dois andam juntos de propósito: abrir sem poder delegar mantém o buraco,
 * e delegar sem ver a tarefa é atirar no escuro.
 */
export const TeamTaskDialog: React.FC<Props> = ({
  task,
  members,
  teamId,
  podeGerenciar,
  onClose,
  onAlterada,
}) => {
  const { assignTask, updateTask } = useTasks();
  const { projects } = useProjects();
  const toast = useToast();
  const [editando, setEditando] = useState<Task | null>(null);
  const [salvando, setSalvando] = useState(false);
  /**
   * A marcação que a pessoa acabou de fazer, antes de o servidor confirmar.
   *
   * Sem isto a caixa só mudava quando a resposta chegava: clicar e ver a caixa
   * continuar desmarcada por meio segundo faz o controle parecer quebrado, e a
   * reação natural é clicar de novo — o que enviaria o estado oposto.
   * Em caso de erro volta ao que o servidor diz, com o motivo no aviso.
   */
  const [otimista, setOtimista] = useState<string[] | null>(null);

  if (!task) return null;

  const doServidor = (task.assignees ?? []).map(a => a.id);
  const responsaveis = otimista ?? doServidor;

  /**
   * Grava na hora, sem botão de salvar.
   *
   * O campo é um só, e o modal não tem rodapé de confirmação: exigir "salvar"
   * aqui criaria um estado sujo que a pessoa fecharia sem perceber. O conjunto
   * inteiro vai numa chamada — é assim que a API evita a corrida de dois
   * gerentes atribuindo ao mesmo tempo.
   */
  const trocarResponsaveis = async (ids: string[]) => {
    setOtimista(ids);
    setSalvando(true);
    try {
      const atualizada = await assignTask(task.id, ids, teamId);
      onAlterada(atualizada);
      setOtimista(null); // a partir daqui quem manda é a resposta
    } catch (err) {
      setOtimista(null); // desfaz a marcação que não vingou
      // A recusa mais provável é de permissão. Mostrar a mensagem do servidor
      // diz POR QUE, em vez de desmarcar a caixa sozinha sem explicação.
      toast.error((err as Error).message || 'Não foi possível alterar os responsáveis.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <TaskDetailModal
        isOpen={!editando}
        task={task}
        project={projects.find(p => p.id === task.projectId)}
        onClose={onClose}
        onEdit={t => setEditando(t)}
        editorDeResponsaveis={
          podeGerenciar ? (
            <div className="relative">
              <AssigneeSelector
                members={members}
                value={responsaveis}
                onChange={trocarResponsaveis}
                disabled={salvando}
              />
              {salvando && (
                <span className="absolute right-0 top-0 text-text-soft">
                  <Loader2 size={14} className="animate-spin" />
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <EditTaskModal
        isOpen={!!editando}
        task={editando ?? undefined}
        onClose={() => setEditando(null)}
        onUpdateTask={async (id, updates) => {
          const atualizada = await updateTask(id, updates);
          if (atualizada) onAlterada(atualizada);
          setEditando(null);
          return atualizada;
        }}
      />
    </>
  );
};
