import React from 'react';
import {
  Lightbulb,
  Edit,
  Trash2,
  Archive,
  CalendarClock,
  Rocket,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tooltip } from '@/components/common/Tooltip';
import { Idea } from '@/types/idea';
import {
  PRIORITY_LABEL,
  formatStartTarget,
  isReviewDue,
  isUnblocked,
  statusMeta,
} from '@/utils/ideaStatus';
import { tint, chipText } from '@/utils/color';

interface IdeaCardProps {
  idea: Idea;
  onOpen: (idea: Idea) => void;
  onEdit: (idea: Idea) => void;
  onArchive: (idea: Idea) => void;
  onDelete: (idea: Idea) => void;
  onConvert: (idea: Idea) => void;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onConvert,
}) => {
  const meta = statusMeta(idea.status);
  const previsao = formatStartTarget(idea.startTarget);
  const convertida = idea.status === 'convertida';
  const liberada = isUnblocked(idea);
  const revisaoVencida = isReviewDue(idea) && !convertida;

  return (
    <Card
      hoverable
      // `h-full`: preenche a altura que o invólucro recebeu da grade. É o que
      // faz o `mt-auto` do rodapé encostar embaixo.
      className="group flex flex-col h-full"
      style={{ backgroundColor: tint(idea.color), borderColor: tint(idea.color, 'strong') }}
      onClick={() => onOpen(idea)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: tint(idea.color, 'medium'), color: chipText(idea.color) }}
        >
          <Lightbulb size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary line-clamp-2">{idea.title}</h3>
          <span
            className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
          >
            {convertida && <CheckCircle2 size={11} />}
            {meta.label}
          </span>
        </div>
      </div>

      {idea.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">{idea.description}</p>
      )}

      {/* Categoria e prioridade */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary mb-3">
        {idea.category && (
          <span className="px-2 py-0.5 rounded-full bg-bg-secondary font-medium">
            {idea.category}
          </span>
        )}
        <span>Prioridade {PRIORITY_LABEL[idea.priority].toLowerCase()}</span>
      </div>

      {idea.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {idea.tags.map(tag => (
            <span
              key={tag.id}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: tint(tag.color, 'medium'), color: chipText(tag.color) }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto space-y-1.5 text-xs">
        {previsao && (
          <p className="flex items-center gap-1.5 text-text-secondary">
            <CalendarClock size={13} className="shrink-0" />
            Começar em {previsao}
          </p>
        )}
        {idea.dependsOnProjectName && (
          <p
            className={`flex items-center gap-1.5 ${
              liberada ? 'text-success font-semibold' : 'text-text-secondary'
            }`}
          >
            <FolderOpen size={13} className="shrink-0" />
            {liberada
              ? `"${idea.dependsOnProjectName}" terminou — pode começar`
              : `Depois de "${idea.dependsOnProjectName}"`}
          </p>
        )}
        {revisaoVencida && (
          <p className="flex items-center gap-1.5 text-primary-vibrant font-semibold">
            <CalendarClock size={13} className="shrink-0" />
            Hora de revisar esta ideia
          </p>
        )}
      </div>

      {/* Ações. stopPropagation em todas: o cartão inteiro abre a ideia, e sem
          isso qualquer clique aqui abriria o detalhe junto com a ação. */}
      <div
        className="flex items-center gap-1 mt-4 pt-3 border-t"
        style={{ borderColor: tint(idea.color, 'medium') }}
        onClick={e => e.stopPropagation()}
      >
        {!convertida && (
          <Tooltip
            content="Transformar em projeto"
            description="Cria um projeto a partir desta ideia, com as tarefas que você escolher."
          >
            <button
              onClick={() => onConvert(idea)}
              className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-bold bg-surface/80 text-primary-vibrant hover:bg-surface transition-colors"
            >
              <Rocket size={14} /> Virar projeto
            </button>
          </Tooltip>
        )}
        <div className="flex gap-1 ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {!convertida && (
            <>
              <button
                onClick={() => onEdit(idea)}
                aria-label="Editar ideia"
                className="p-2 rounded-lg text-primary-vibrant hover:bg-primary-light transition-colors"
              >
                <Edit size={15} />
              </button>
              <button
                onClick={() => onArchive(idea)}
                aria-label={idea.status === 'arquivada' ? 'Desarquivar' : 'Arquivar'}
                title={idea.status === 'arquivada' ? 'Desarquivar' : 'Arquivar'}
                className="p-2 rounded-lg text-text-secondary hover:bg-bg-secondary transition-colors"
              >
                <Archive size={15} />
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(idea)}
            aria-label="Excluir ideia"
            className="p-2 rounded-lg text-danger hover:bg-rose-50 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
};
