import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { MemberLoad } from '@/utils/teamReport';
import { initialsOf } from '@/contexts/UserContext';
import { TeamRole } from '@/types/team';
import { RoleBadge } from './TeamUI';
import { memberColor } from './TeamTaskRow';

interface Props {
  membro: MemberLoad;
  role: TeamRole;
  /** É você. A própria linha ganha destaque — é a que se procura primeiro. */
  euMesmo?: boolean;
  /** Maior carga da equipe: a barra é relativa a ela, não a um teto fixo. */
  maiorCarga: number;
  /** Abre as tarefas desta pessoa. Sem isto a linha é um beco sem saída. */
  onVerTarefas?: () => void;
  /** Ações de gestão (papel, cargo, remover), quando quem olha pode agir. */
  acoes?: React.ReactNode;
}

/**
 * Uma pessoa da equipe, com a carga dela.
 *
 * Substituiu o cartão de contato (avatar, e-mail, cargo), que respondia "quem
 * está aqui" — pergunta que se faz uma vez. Quem distribui trabalho pergunta
 * todo dia "quem está afogado", e é isso que a linha mostra.
 *
 * O que mudou desta vez: o papel aparece POR EXTENSO (antes era um ícone sem
 * legenda) e o nome leva às tarefas da pessoa. Ver a Ana com 12 abertas e não
 * conseguir chegar nas 12 era o beco sem saída bem no ponto em que a decisão
 * de redistribuir é tomada.
 */
export const MemberRow: React.FC<Props> = ({
  membro,
  role,
  euMesmo = false,
  maiorCarga,
  onVerTarefas,
  acoes,
}) => {
  /**
   * Barra relativa à MAIOR carga da equipe, não a um máximo fixo.
   *
   * O que importa a quem distribui é a comparação — "a Ana tem o dobro do
   * Bruno" —, não o valor absoluto. Um teto fixo achataria todas as barras
   * numa equipe pequena e estouraria numa grande.
   */
  const pct = maiorCarga > 0 ? Math.round((membro.open / maiorCarga) * 100) : 0;
  const semTarefas = membro.assigned === 0;

  return (
    <div className="group flex items-center gap-3 py-3">
      {membro.avatar ? (
        <img src={membro.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: memberColor(membro.userId) }}
        >
          {initialsOf(membro.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onVerTarefas}
            disabled={!onVerTarefas}
            className="group/nome inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-text-primary transition-colors enabled:hover:text-primary-vibrant disabled:cursor-default"
          >
            <span className="truncate">{membro.name}</span>
            {euMesmo && <span className="shrink-0 text-xs font-normal text-text-soft">(você)</span>}
            {onVerTarefas && (
              <ArrowRight
                size={13}
                className="shrink-0 opacity-0 transition-opacity group-hover/nome:opacity-100"
              />
            )}
          </button>
          <RoleBadge role={role} />
        </div>
        {/* Cargo quando existe; senão o próprio estado de carga ocupa a linha,
            para não deixar um vazio que parece dado faltando. */}
        <p className="truncate text-xs text-text-secondary">
          {membro.title || (semTarefas ? 'Sem tarefas atribuídas' : `${membro.completed} entregues`)}
        </p>
      </div>

      <div className="flex w-28 shrink-0 flex-col items-end gap-1 sm:w-40">
        <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
          {membro.overdue > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-danger"
              title={`${membro.overdue} atrasada${membro.overdue > 1 ? 's' : ''}`}
            >
              <AlertTriangle size={11} />
              {membro.overdue}
            </span>
          )}
          <span className={semTarefas ? 'text-text-soft' : 'text-text-primary'}>
            {membro.open} aberta{membro.open === 1 ? '' : 's'}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              membro.overdue > 0 ? 'bg-danger' : 'bg-primary-vibrant'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Espaço reservado mesmo sem ações: sem ele, as linhas de quem
          administra e de quem não administra teriam larguras diferentes e as
          barras desalinhariam entre si. */}
      <div className="flex w-9 shrink-0 justify-end">{acoes}</div>
    </div>
  );
};
