import React from 'react';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { CardSummary } from '@/utils/cardSummary';

const TONE = {
  alert: { icon: AlertCircle, className: 'text-danger' },
  positive: { icon: CheckCircle2, className: 'text-success' },
  neutral: { icon: ArrowRight, className: 'text-text-secondary' },
} as const;

/**
 * Corpo do painel de síntese. Separado do HoverRevealCard porque o card é
 * genérico (só anima) e isto é o conteúdo — projeto e ideia compartilham o
 * mesmo formato de resumo.
 */
export const CardSummaryContent: React.FC<{ summary: CardSummary }> = ({ summary }) => {
  const { icon: Icon, className } = TONE[summary.tone];

  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className={`mt-0.5 shrink-0 ${className}`} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-tight ${className}`}>{summary.headline}</p>
        {summary.detail && (
          <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{summary.detail}</p>
        )}
      </div>
    </div>
  );
};
