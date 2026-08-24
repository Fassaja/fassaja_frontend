import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Check, CalendarDays, ChevronDown, ListChecks, Timer, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { Task, TaskStatus } from '@/types/task';
import { Project } from '@/types/project';
import { Card } from '@/components/common/Card';
import { CompleteCheck } from '@/components/common/CompleteCheck';
import { formatDate } from '@/utils/date';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/contexts/ToastContext';
import { tint, chipText } from '@/utils/color';
import { subtaskProgress } from '@/utils/subtasks';
import { useFocusTimes } from '@/contexts/FocusTimesContext';
import { rotuloDeDuracao } from '@/utils/focoCoach';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onComplete?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  /** Modo de seleção em massa: o card vira um item selecionável. */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

const statusConfig: Record<Task['status'], { label: string; className: string; dot: string }> = {
  pending: { label: 'Pendente', className: 'bg-bg-secondary text-text-secondary', dot: '#64748B' },
  in_progress: { label: 'Em andamento', className: 'bg-primary-light text-primary-vibrant', dot: '#2477FF' },
  completed: { label: 'Concluída', className: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dot: '#22C55E' },
  overdue: { label: 'Atrasada', className: 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300', dot: '#F43F5E' },
};

// Status que o usuário pode escolher direto no card (overdue é calculado pelo servidor).
const STATUS_CHOICES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

interface StatusSelectProps {
  task: Task;
}

/** Badge de status que vira um menu para trocar pendente/andamento/concluída sem abrir o editar. */
const MENU_W = 176; // 11rem
const MENU_H = 148; // ~3 itens + padding

const StatusSelect: React.FC<StatusSelectProps> = ({ task }) => {
  const { updateTask, completeTask } = useTasks();
  const toast = useToast();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const current = statusConfig[task.status];

  // Menu via portal com posição fixa: não é cortado por colunas com scroll.
  const openMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openUp = rect.bottom + MENU_H > window.innerHeight;
    setPos({
      top: openUp ? rect.top - MENU_H - 6 : rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - MENU_W - 8),
    });
    setOpen(true);
  };

  // Fecha ao rolar/redimensionar para o menu não "descolar" do botão.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const change = async (e: React.MouseEvent, next: TaskStatus) => {
    e.stopPropagation();
    setOpen(false);
    if (next === task.status || busy) return;
    try {
      setBusy(true);
      // Concluir passa pelo completeTask (cuida do completedAt + comemoração).
      if (next === 'completed') await completeTask(task.id);
      else await updateTask(task.id, { status: next });
      toast.success(`Status: ${statusConfig[next].label}`);
    } catch {
      toast.error('Não foi possível mudar o status. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={e => {
          e.stopPropagation();
          open ? setOpen(false) : openMenu();
        }}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mudar status"
        className={`inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-0.5 rounded-full transition-all hover:brightness-95 active:scale-95 disabled:opacity-60 ${current.className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: current.dot }} />
        {current.label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <>
          <div
            className="fixed inset-0 z-[60]"
            onClick={e => { e.stopPropagation(); setOpen(false); }}
          />
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_W }}
            className="z-[61] rounded-xl border border-border bg-surface shadow-lg overflow-hidden py-1"
            onClick={e => e.stopPropagation()}
          >
            {STATUS_CHOICES.map(value => {
              const opt = statusConfig[value];
              const isCurrent = value === task.status;
              return (
                <button
                  key={value}
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  onClick={e => change(e, value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opt.dot }} />
                  <span className="flex-1 text-left">{opt.label}</span>
                  {isCurrent && <Check size={15} className="text-primary-vibrant shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        </>,
        document.body,
      )}
    </>
  );
};

/**
 * `dot` é classe, não hex: os valores fixos que estavam aqui (#22C55E,
 * #FBBF24, #8B5CF6) são os tons do tema CLARO, então o marcador de prioridade
 * não acompanhava a troca para o escuro. Os tokens `priority.*` já trazem o
 * par certo para cada tema.
 */
const priorityConfig: Record<Task['priority'], { label: string; dot: string; stripe: string }> = {
  low: { label: 'Baixa', dot: 'bg-priority-low', stripe: 'bg-priority-low' },
  medium: { label: 'Média', dot: 'bg-priority-medium', stripe: 'bg-priority-medium' },
  high: { label: 'Alta', dot: 'bg-priority-high', stripe: 'bg-priority-high' },
};

/** Tags mostradas no card; o resto vira "+N" e aparece ao abrir a tarefa. */
const MAX_TAGS = 3;

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onComplete,
  onDelete,
  onClick,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}) => {
  const { account } = useAuth();
  const isCompleted = task.status === 'completed';
  const priorityInfo = priorityConfig[task.priority];
  const passos = subtaskProgress(task.subtasks);
  // Tempo focado nesta tarefa. Só aparece quando existe — a maioria não tem,
  // e um "0 min" em todo cartão seria ruído puro.
  const minutosFoco = useFocusTimes().get(task.id) ?? 0;
  const statusInfo = statusConfig[task.status];

  /**
   * Responsáveis, do ponto de vista de quem está olhando.
   *
   * A proposta (aceitar/recusar) deixou de existir: quem é adicionado já
   * responde pela tarefa. Sobrou o que importa na lista — quantos já
   * entregaram, e se eu sou um deles.
   */
  const responsaveis = task.assignees ?? [];
  const entregues = responsaveis.filter(a => a.done).length;
  const souResponsavel = !!account && responsaveis.some(a => a.id === account.id);
  const jaEntreguei = !!account && responsaveis.some(a => a.id === account.id && a.done);

  const handleClick = () => {
    if (selectionMode) onToggleSelect?.(task.id);
    else onClick?.(task);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
    >
      <Card
        hoverable
        onClick={handleClick}
        padding="none"
        className={`relative flex items-start gap-3 overflow-hidden p-3.5 pl-4 group ${
          selected ? 'ring-2 ring-primary-vibrant border-primary-vibrant' : ''
        }`}
      >
        {/* Prioridade como faixa lateral, e não como mais uma pílula.
            Era a informação mais decisiva do card e tinha exatamente o mesmo
            peso visual de uma tag qualquer — dava para ler seis pílulas antes
            de achar "Alta". Aqui ela é lida de relance, sem custar linha.
            A cor não fica sozinha: o rótulo continua escrito na linha de baixo,
            porque quem não distingue as cores precisa da palavra. */}
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${priorityInfo.stripe} ${
            isCompleted ? 'opacity-40' : ''
          }`}
        />
        {/* Controle à esquerda: seleção (modo massa) ou concluir (normal) */}
        {selectionMode ? (
          <span
            aria-hidden
            className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors ${
              selected
                ? 'bg-primary-vibrant border-primary-vibrant text-white'
                : 'border-border group-hover:border-primary-vibrant'
            }`}
          >
            {selected && <Check size={13} strokeWidth={3} />}
          </span>
        ) : (
          <CompleteCheck
            completed={isCompleted}
            onToggle={() => onComplete?.(task.id)}
            className="mt-0.5"
          />
        )}

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-semibold leading-snug truncate ${
              isCompleted ? 'line-through text-text-soft' : 'text-text-primary'
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}

          {/* Linha de contexto: prioridade, projeto e prazo em texto quieto,
              separados por ponto médio. Só o status continua sendo pílula —
              é o único item CLICÁVEL aqui (abre o menu de troca), e a forma de
              botão é o que avisa disso. Quando tudo era pílula, nada parecia
              clicável em especial. */}
          <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center mt-2 text-[11px] text-text-secondary">
            {selectionMode ? (
              <span
                className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${statusInfo.className}`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusInfo.dot }} />
                {statusInfo.label}
              </span>
            ) : (
              <StatusSelect task={task} />
            )}

            <span className="inline-flex items-center gap-1 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${priorityInfo.dot}`} />
              {priorityInfo.label}
            </span>

            {/* Progresso do checklist: fica ANTES do projeto porque é estado
                da tarefa, não classificação dela. Some quando não há passos —
                "0/0" não informa nada. */}
            {passos.total > 0 && (
              <>
                <span className="text-text-soft" aria-hidden>·</span>
                <span
                  className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                    passos.completo ? 'text-success' : ''
                  }`}
                  title={`${passos.feitos} de ${passos.total} passos concluídos`}
                >
                  <ListChecks size={12} />
                  {passos.feitos}/{passos.total}
                </span>
              </>
            )}

            {project && (
              <>
                <span className="text-text-soft" aria-hidden>·</span>
                <span className="inline-flex items-center gap-1 font-medium min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </span>
              </>
            )}

            {task.dueDate && (
              <>
                <span className="text-text-soft" aria-hidden>·</span>
                {/* Prazo vencido em vermelho: era a única informação urgente do
                    card impressa no mesmo cinza do resto. */}
                <span
                  className={`inline-flex items-center gap-1 ${
                    task.status === 'overdue' ? 'font-bold text-danger' : 'font-medium'
                  }`}
                >
                  <CalendarDays size={12} className={task.status === 'overdue' ? '' : 'text-text-soft'} />
                  {formatDate(task.dueDate)}
                </span>
              </>
            )}

            {minutosFoco > 0 && (
              <>
                <span className="text-text-soft" aria-hidden>·</span>
                {/* O tempo que já foi investido aqui. É a única informação do
                    cartão que fala do PASSADO, e é o que dá peso à decisão de
                    continuar ou largar. */}
                <span
                  className="inline-flex items-center gap-1 font-medium text-primary-vibrant"
                  title={`${rotuloDeDuracao(minutosFoco)} de foco nesta tarefa`}
                >
                  <Timer size={12} />
                  {rotuloDeDuracao(minutosFoco)}
                </span>
              </>
            )}

            {/* Progresso da equipe, não o nome de um responsável.
                Com várias pessoas, "quem é o responsável" deixou de ter
                resposta única; o que a pessoa precisa saber de relance é
                quantos faltam — e se ela mesma já entregou. */}
            {responsaveis.length > 0 && (
              <>
                <span className="text-text-soft" aria-hidden>·</span>
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    entregues === responsaveis.length ? 'text-success' : ''
                  }`}
                  title={responsaveis
                    .map(a => `${a.name}${a.done ? ' (entregou)' : ''}`)
                    .join(', ')}
                >
                  <Users size={12} />
                  {entregues}/{responsaveis.length}
                  {souResponsavel && !jaEntreguei && (
                    <span className="font-normal text-text-secondary">· falta você</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Tags numa linha própria, abaixo do contexto: são rótulos que a
              pessoa criou e cada uma traz cor forte. Misturadas à linha de cima
              elas empurravam prazo e projeto para longe do título. Acima de
              três viram "+N" — um card com oito tags virava uma parede. */}
          {(task.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 items-center mt-1.5">
              {(task.tags ?? []).slice(0, MAX_TAGS).map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                  style={{ backgroundColor: tint(tag.color), color: chipText(tag.color) }}
                >
                  {tag.name}
                </span>
              ))}
              {(task.tags ?? []).length > MAX_TAGS && (
                <span
                  className="text-[10px] font-semibold text-text-soft"
                  title={(task.tags ?? []).slice(MAX_TAGS).map(t => t.name).join(', ')}
                >
                  +{(task.tags ?? []).length - MAX_TAGS}
                </span>
              )}
            </div>
          )}

          {/* Proposta de tarefa para o usuário atual */}
        </div>

        {/* Ações (escondidas no modo seleção; a exclusão em massa cuida disso) */}
        {!selectionMode && onDelete && (
          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              aria-label="Excluir tarefa"
              className="p-1.5 hover:bg-rose-50 rounded-lg text-danger transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
