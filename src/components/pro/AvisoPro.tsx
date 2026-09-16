import React from 'react';
import { Lock } from 'lucide-react';
import { AREAS_PRO, AreaPro, useProStatus } from '@/contexts/ProContext';

/**
 * A faixa no topo de uma área do Pro para quem não é Pro: diz o que está
 * trancado (criar/editar) e o que não está (ver o que já existe), antes de
 * a pessoa clicar e levar o convite na cara. Some para quem é Pro e antes
 * de o app existir na loja.
 */
export const AvisoPro: React.FC<{ area: AreaPro }> = ({ area }) => {
  const { trancado, convidar } = useProStatus();
  if (!trancado) return null;
  const { oQue } = AREAS_PRO[area];
  return (
    <div
      role="status"
      className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm"
    >
      <Lock size={16} className="shrink-0 text-amber-600 dark:text-amber-300" />
      <p className="flex-1 min-w-[12rem] text-text-primary">
        <strong>{oQue[0].toUpperCase() + oQue.slice(1)}</strong> é do plano Pro.{' '}
        <span className="text-text-secondary">O que você já tem continua aqui.</span>
      </p>
      <button
        type="button"
        onClick={() => convidar(area)}
        className="font-medium text-primary-vibrant hover:text-primary-hover"
      >
        Conhecer o Pro →
      </button>
    </div>
  );
};
