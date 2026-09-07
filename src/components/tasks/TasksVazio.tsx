import React from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { textoDoRecorte, vazioDeTarefas } from '@/utils/vazioDeTarefas';

interface TasksVazioProps {
  /** Quantas tarefas existem ANTES dos filtros desta tela. */
  total: number;
  onNewTask?: () => void;
  onClearFilters?: () => void;
}

/**
 * O vazio das tarefas — e a diferença entre os dois vazios que existem aqui.
 *
 * O quadro e a lista mostravam o MESMO recado ("Nenhuma tarefa encontrada —
 * ajuste seus filtros ou crie uma nova"), sem ação nenhuma junto dele, tanto
 * para quem nunca criou uma tarefa quanto para quem acabou de digitar uma
 * busca sem resultado. As duas situações não têm nada em comum:
 *
 *  - `total === 0` é o PRIMEIRO USO. Não há filtro a ajustar; falar em filtro
 *    aqui manda a pessoa procurar um problema que não existe. O próximo passo
 *    é criar a primeira tarefa, e o botão precisa estar junto da frase.
 *  - `total > 0` é o RECORTE. As tarefas existem e o filtro atual as escondeu;
 *    o próximo passo é desfazer o recorte, e a saída precisa ser um clique, e
 *    não uma caça aos controles espalhados pela barra acima.
 *
 * O caso do recorte vai sem mascote de propósito: é o vazio que a pessoa vê
 * várias vezes na mesma sessão, a cada busca que não casa.
 */
export const TasksVazio: React.FC<TasksVazioProps> = ({ total, onNewTask, onClearFilters }) => {
  const vazio = vazioDeTarefas(total);

  if (vazio.tipo === 'primeiro-uso') {
    return (
      <EmptyState
        mascotState="happy"
        title="Nenhuma tarefa por aqui ainda"
        description="Crie a primeira e ela aparece nesta tela, organizada por prazo e por status."
        action={onNewTask ? { label: 'Criar primeira tarefa', onClick: onNewTask } : undefined}
      />
    );
  }

  return (
    <EmptyState
      variant="plain"
      title="Nenhuma tarefa corresponde a este recorte"
      description={textoDoRecorte(vazio.escondidas)}
      action={onClearFilters ? { label: 'Limpar filtros', onClick: onClearFilters } : undefined}
      secondaryAction={onNewTask ? { label: 'Criar uma tarefa', onClick: onNewTask } : undefined}
    />
  );
};
