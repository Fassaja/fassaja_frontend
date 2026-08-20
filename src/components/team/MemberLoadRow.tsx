import React from 'react';
import { Crown, ShieldCheck, MoreVertical, AlertTriangle } from 'lucide-react';
import { MemberLoad } from '@/utils/teamReport';
import { initialsOf } from '@/contexts/UserContext';
import { AVATAR_COLORS } from './teamConstants';

/** Cor estável por pessoa — não muda se a lista reordena. */
function corDe(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface Props {
  membro: MemberLoad;
  ehDono: boolean;
  gerenciaTarefas: boolean;
  /** Maior carga da equipe — a barra é relativa a ela, não a um teto fixo. */
  maiorCarga: number;
  /** Menu de ações; só aparece para quem administra. */
  onAcoes?: () => void;
}

/**
 * Uma pessoa da equipe, com a carga dela.
 *
 * Substitui o cartão de contato (avatar, e-mail, cargo), que respondia "quem
 * está na equipe" — pergunta que se faz uma vez. Quem administra pergunta todo
 * dia "quem está afogado e o que está atrasado", e é isso que a linha mostra.
 *
 * Os números já eram calculados em `teamReport.ts`; viviam só na tela de
 * Relatórios, a dois cliques de distância de onde a decisão é tomada.
 */
export const MemberLoadRow: React.FC<Props> = ({
  membro,
  ehDono,
  gerenciaTarefas,
  maiorCarga,
  onAcoes,
}) => {
  /**
   * Barra relativa à maior carga da equipe, e não a um máximo fixo.
   *
   * O que importa a quem distribui é a COMPARAÇÃO — "a Ana tem o dobro do
   * Bruno" —, não o valor absoluto. Um teto fixo achataria todas as barras
   * numa equipe pequena e estouraria numa grande.
   */
  const pct = maiorCarga > 0 ? Math.round((membro.open / maiorCarga) * 100) : 0;
  const semTarefas = membro.assigned === 0;

  return (
    <div className="flex items-center gap-3 py-3">
      {membro.avatar ? (
        <img src={membro.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: corDe(membro.userId) }}
        >
          {initialsOf(membro.name)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-text-primary">{membro.name}</p>
          {ehDono && <Crown size={12} className="shrink-0 text-amber-500" aria-label="Dono" />}
          {!ehDono && gerenciaTarefas && (
            <ShieldCheck
              size={12}
              className="shrink-0 text-primary-vibrant"
              aria-label="Gerencia tarefas"
            />
          )}
        </div>

        {/* Cargo quando existe; senão o próprio estado de carga ocupa a linha,
            para não deixar um vazio que parece dado faltando. */}
        <p className="truncate text-xs text-text-secondary">
          {membro.title || (semTarefas ? 'Sem tarefas atribuídas' : `${membro.completed} entregues`)}
        </p>
      </div>

      {/* Barra + números. `tabular-nums` porque a coluna alinha dígitos. */}
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

      {onAcoes ? (
        <button
          type="button"
          onClick={onAcoes}
          aria-label={`Ações de ${membro.name}`}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-soft transition-colors hover:text-text-primary sm:h-8 sm:w-8"
        >
          <MoreVertical size={16} />
        </button>
      ) : (
        // Espaço reservado: sem ele as linhas de quem administra e de quem não
        // administra teriam larguras diferentes e a barra desalinharia.
        <span className="h-10 w-10 shrink-0 sm:h-8 sm:w-8" aria-hidden />
      )}
    </div>
  );
};
