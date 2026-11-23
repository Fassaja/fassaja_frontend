import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { Check, Maximize2, Trash2, X } from 'lucide-react';
import type { Task, TaskStatus } from '@/types/task';
import type { Project } from '@/types/project';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { HeadlineInput, NoteField } from '@/components/common/HeadlineInput';
import { Tooltip } from '@/components/common/Tooltip';
import { FocusStarter } from '@/components/focus/FocusStarter';
import { SubtaskList } from './SubtaskList';
import { TaskComments } from './TaskComments';
import { LinhaDePropriedades } from './LinhaDePropriedades';
import { formatDate } from '@/utils/date';
import { transicao } from '@/components/motion/tokens';

/** Largura do painel; quem o usa reserva o mesmo espaço à direita. */
export const LARGURA_DO_PAINEL = 420;

interface PainelDaTarefaProps {
  task: Task;
  project?: Project;
  onClose: () => void;
  /** Abre o formulário completo (responsáveis, encadeamento). */
  onEditarTudo: (task: Task) => void;
}

/**
 * Detalhe da tarefa como painel lateral (desktop).
 *
 * No lugar do modal que cobria o quadro inteiro: o painel ocupa a direita e o
 * quadro continua à vista e clicável — clicar em outro cartão troca a tarefa
 * do painel, sem fechar e abrir de novo. Por isso ele NÃO é modal: não prende
 * o foco nem escurece o fundo.
 *
 * E é editável ali mesmo: título e descrição salvam ao sair do campo; prazo,
 * prioridade, projeto, status e tags salvam a cada escolha, pela mesma linha
 * de propriedades dos formulários. Responsáveis e "Depois de" continuam no
 * formulário completo ("Editar tudo").
 *
 * Esc fecha (num campo de texto, o primeiro Esc só sai do campo).
 */
export const PainelDaTarefa: React.FC<PainelDaTarefaProps> = ({ task, project, onClose, onEditarTudo }) => {
  // Marca o <body> enquanto o painel existe: é o que tira o Bob de cima dele
  // (ver `.bob-desvia` em index.css).
  useEffect(() => {
    document.body.dataset.painelLateral = '1';
    return () => {
      delete document.body.dataset.painelLateral;
    };
  }, []);

  return (
  <m.aside
    role="dialog"
    aria-modal="false"
    aria-label={`Tarefa: ${task.title}`}
    initial={{ x: 24, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 24, opacity: 0, transition: transicao.saida }}
    transition={transicao.media}
    style={{ width: LARGURA_DO_PAINEL }}
    // Abaixo da barra do topo (top-20) e acima do conteúdo; os modais (z-60+)
    // continuam por cima dele.
    className="fixed bottom-0 right-0 top-20 z-20 flex flex-col border-l border-border bg-surface shadow-xl"
  >
    {/* `key`: trocar de tarefa recomeça os campos do zero — sem isto o título
        em edição de uma tarefa vazaria para a próxima. */}
    <Conteudo key={task.id} task={task} project={project} onClose={onClose} onEditarTudo={onEditarTudo} />
  </m.aside>
  );
};

const Conteudo: React.FC<PainelDaTarefaProps> = ({ task, onClose, onEditarTudo }) => {
  const { updateTask, completeTask, excluirComDesfazer } = useTasks();
  const { isGuest } = useAuth();
  const toast = useToast();
  const [titulo, setTitulo] = useState(task.title);
  const [descricao, setDescricao] = useState(task.description ?? '');
  const raizRef = useRef<HTMLDivElement>(null);

  // Mudou por fora (outra aba, o quadro): acompanha, desde que a pessoa não
  // esteja escrevendo neste campo agora.
  useEffect(() => {
    if (document.activeElement?.getAttribute('name') !== 'title') setTitulo(task.title);
  }, [task.title]);
  useEffect(() => {
    if (document.activeElement?.getAttribute('name') !== 'description') setDescricao(task.description ?? '');
  }, [task.description]);

  const salvar = (updates: Parameters<typeof updateTask>[1]) =>
    updateTask(task.id, updates).catch((err: Error) =>
      toast.error(err.message || 'Não foi possível salvar. Tente novamente.'),
    );

  const salvarTitulo = () => {
    const t = titulo.trim();
    if (!t) {
      setTitulo(task.title); // título vazio não salva: volta ao que era
      return;
    }
    if (t !== task.title) void salvar({ title: t });
  };
  const salvarDescricao = () => {
    if (descricao !== (task.description ?? '')) void salvar({ description: descricao });
  };

  const mudarStatus = (s: TaskStatus) => {
    // Concluir pelo caminho próprio (data de conclusão, comemoração, Desfazer).
    if (s === 'completed') completeTask(task.id).catch(() => toast.error('Não foi possível concluir a tarefa.'));
    else void salvar({ status: s });
  };

  // Esc: num campo, só sai dele (o blur salva); fora, fecha o painel. Modal
  // aberto por cima responde ao Esc dele, não a este.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const ativo = document.activeElement as HTMLElement | null;
      if (ativo && raizRef.current?.contains(ativo) && /^(INPUT|TEXTAREA)$/.test(ativo.tagName)) {
        ativo.blur();
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  const responsaveis = task.assignees ?? [];
  const status: TaskStatus = task.status === 'overdue' ? 'pending' : task.status;

  return (
    <div ref={raizRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-soft">
          {task.status === 'overdue' ? 'Atrasada' : 'Tarefa'}
        </span>
        <div className="flex items-center gap-1">
          <Tooltip content="Editar tudo (responsáveis, encadear)">
            <button
              type="button"
              onClick={() => onEditarTudo(task)}
              aria-label="Editar tudo"
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-primary-vibrant"
            >
              <Maximize2 size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Excluir">
            <button
              type="button"
              onClick={() => {
                excluirComDesfazer([task.id]);
                onClose();
              }}
              aria-label="Excluir tarefa"
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          </Tooltip>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-secondary"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div>
          <HeadlineInput
            name="title"
            aria-label="Título da tarefa"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={e => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            maxLength={200}
            className={task.status === 'completed' ? 'line-through text-text-soft' : ''}
          />
          <NoteField
            name="description"
            aria-label="Descrição da tarefa"
            className="mt-2"
            placeholder="Adicionar descrição…"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            onBlur={salvarDescricao}
          />
        </div>

        {/* A mesma linha dos formulários, salvando a cada escolha. O `-mx-5`
            dela é para a folha do celular; aqui o painel tem o próprio
            respiro, então a linha quebra em vez de rolar. */}
        <div className="[&>div]:mx-0 [&>div]:flex-wrap [&>div]:overflow-visible [&>div]:px-0">
          <LinhaDePropriedades
            prazo={task.dueDate ?? ''}
            onPrazo={v => void salvar({ dueDate: v })}
            prioridade={task.priority}
            onPrioridade={v => void salvar({ priority: v })}
            projetoId={task.projectId ?? ''}
            onProjeto={v => {
              if (v !== (task.projectId ?? '')) void salvar({ projectId: v || null });
            }}
            status={status}
            onStatus={mudarStatus}
            tags={
              isGuest
                ? undefined
                : { ids: (task.tags ?? []).map(t => t.id), onMudar: ids => void salvar({ tagIds: ids }) }
            }
          />
        </div>

        {responsaveis.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-text-soft">
              Responsáveis · {responsaveis.filter(a => a.done).length} de {responsaveis.length}
            </p>
            <ul className="flex flex-col gap-1.5">
              {responsaveis.map(a => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      a.done ? 'bg-success text-white' : 'border-2 border-border'
                    }`}
                  >
                    {a.done && <Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={a.done ? 'text-text-soft line-through' : 'text-text-primary'}>{a.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.status !== 'completed' && <FocusStarter taskId={task.id} />}
        <SubtaskList task={task} />

        <p className="text-xs text-text-soft">
          Criada em {formatDate(task.createdAt)}
          {task.completedAt && ` · concluída em ${formatDate(task.completedAt)}`}
        </p>

        <TaskComments taskId={task.id} />
      </div>
    </div>
  );
};
