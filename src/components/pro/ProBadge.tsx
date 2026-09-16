import React from 'react';
import { Sparkles } from 'lucide-react';
import { useProStatus } from '@/contexts/ProContext';

/** O selo "PRO". Só aparece para quem é — e some sozinho quando deixa de ser. */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { pro } = useProStatus();
  if (!pro) return null;
  return (
    <span
      title="Assinante do Fassajá Pro"
      className={`inline-flex items-center gap-1 rounded-full bg-primary-vibrant px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white ${className}`}
    >
      <Sparkles size={11} /> Pro
    </span>
  );
};
