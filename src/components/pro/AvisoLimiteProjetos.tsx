import React from 'react';
import { FolderKanban } from 'lucide-react';
import { useProStatus } from '@/contexts/ProContext';
import { FREE_PROJECT_LIMIT } from '@/utils/playConfig';

/**
 * "3 de 5 projetos em andamento" para a conta gratuita. Conta só os
 * pessoais não concluídos — os mesmos que o servidor conta — para a pessoa
 * saber que concluir um libera a vaga antes de bater na parede.
 */
export const AvisoLimiteProjetos: React.FC<{ emAndamento: number }> = ({ emAndamento }) => {
  const { trancado, convidar } = useProStatus();
  if (!trancado) return null;
  const cheio = emAndamento >= FREE_PROJECT_LIMIT;
  return (
    <div
      role="status"
      className={`mb-5 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
        cheio
          ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
          : 'border-border bg-bg-secondary'
      }`}
    >
      <FolderKanban size={16} className="shrink-0 text-text-secondary" />
      <p className="flex-1 min-w-[12rem] text-text-primary">
        <strong className="tabular-nums">
          {Math.min(emAndamento, FREE_PROJECT_LIMIT)} de {FREE_PROJECT_LIMIT}
        </strong>{' '}
        projetos em andamento na conta gratuita.{' '}
        <span className="text-text-secondary">
          {cheio ? 'Conclua um para abrir vaga, ou' : 'Concluídos não contam.'}
        </span>
      </p>
      <button
        type="button"
        onClick={() => convidar()}
        className="font-medium text-primary-vibrant hover:text-primary-hover"
      >
        {cheio ? 'assine o Pro →' : 'Pro é ilimitado →'}
      </button>
    </div>
  );
};
