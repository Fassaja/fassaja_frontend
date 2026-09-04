import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Section } from '@/components/common/Section';
import { CountUp } from '@/components/common/CountUp';
import { XP_PER_LEVEL } from '@/utils/xp';
import { useXp } from '@/hooks/useXp';

/**
 * Nível e progresso para o próximo.
 *
 * Sem cartão em volta e sem gradiente: a medalha do nível é redonda e azul
 * porque é uma medalha, mas dois tons desbotando um no outro não diziam nada
 * que um tom só não diga. A estrela sobreposta também saiu — era enfeite em
 * cima de um número que já é o destaque do bloco.
 */
export const XpCard: React.FC = () => {
  const xp = useXp();

  return (
    <Section
      title="Seu nível"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-sm font-bold text-primary-vibrant">
          <Sparkles size={15} /> <CountUp value={xp.xp} /> XP
        </span>
      }
    >
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-primary-vibrant text-white">
          <span className="text-[9px] font-semibold uppercase leading-none tracking-wide text-white/80">
            Nível
          </span>
          <span className="mt-0.5 text-2xl font-extrabold leading-none">{xp.level}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between text-xs font-semibold text-text-secondary">
            <span>Próximo: nível {xp.level + 1}</span>
            <span>
              {xp.intoLevel}/{XP_PER_LEVEL}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary-vibrant"
              initial={{ width: 0 }}
              animate={{ width: `${xp.pctToNext}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            {xp.completedCount} tarefa{xp.completedCount === 1 ? '' : 's'} concluída
            {xp.completedCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </Section>
  );
};
