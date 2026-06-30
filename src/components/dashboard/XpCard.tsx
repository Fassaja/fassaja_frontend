import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { CountUp } from '@/components/common/CountUp';
import { Task } from '@/types/task';
import { computeXp, XP_PER_LEVEL } from '@/utils/xp';

interface XpCardProps {
  tasks: Task[];
  children?: React.ReactNode; // conteúdo extra no mesmo card (ex.: sequência)
}

export const XpCard: React.FC<XpCardProps> = ({ tasks, children }) => {
  const xp = computeXp(tasks);

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">Seu nível</h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light text-primary-vibrant text-sm font-bold">
          <Sparkles size={15} /> <CountUp value={xp.xp} /> XP
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-vibrant to-primary-dark flex flex-col items-center justify-center text-white shadow-md">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-white/80 leading-none">
              Nível
            </span>
            <span className="text-2xl font-extrabold leading-none mt-0.5">{xp.level}</span>
          </div>
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-sm">
            <Star size={12} fill="currentColor" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1">
            <span>Próximo: nível {xp.level + 1}</span>
            <span>{xp.intoLevel}/{XP_PER_LEVEL}</span>
          </div>
          <div className="h-2.5 rounded-full bg-bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-vibrant to-turquoise"
              initial={{ width: 0 }}
              animate={{ width: `${xp.pctToNext}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {xp.completedCount} tarefa{xp.completedCount === 1 ? '' : 's'} concluída
            {xp.completedCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {children && <div className="mt-6 pt-6 border-t border-border">{children}</div>}
    </Card>
  );
};
