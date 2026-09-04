import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Moon } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useUser, computeStreak } from '@/contexts/UserContext';
import { useTasks } from '@/hooks/useTasks';

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Conteúdo da sequência (sem o Card em volta) — para embutir em outro card.
export const StreakContent: React.FC = () => {
  const { user } = useUser();
  const { tasks } = useTasks();
  const reduce = useReducedMotion();

  const activeDays = new Set<string>(user.productiveDays);
  tasks.forEach(t => {
    if (t.status === 'completed' && t.completedAt) {
      activeDays.add(isoOf(new Date(t.completedAt)));
    }
  });
  const streak = computeStreak(Array.from(activeDays), user.streakDays);
  const streakDays = user.streakDays?.length ? user.streakDays : [0, 1, 2, 3, 4, 5, 6];
  const weekStrip = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      iso: isoOf(d),
      letter: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][d.getDay()],
      active: activeDays.has(isoOf(d)),
      rest: !streakDays.includes(d.getDay()), // dia de folga: não quebra a sequência
      isToday: i === 6,
    };
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-text-soft">
          Sequência produtiva
        </h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300 font-bold text-sm">
          <motion.span
            className="inline-flex"
            initial={reduce || streak === 0 ? false : { scale: 0.4, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 14 }}
          >
            <Flame size={16} />
          </motion.span>
          {streak} {streak === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-4 -mt-1">
        {streak === 0
          ? 'Conclua uma tarefa hoje para começar uma sequência.'
          : 'Dias seguidos concluindo pelo menos uma tarefa.'}
      </p>

      <div className="flex justify-between gap-2">
        {weekStrip.map((day, i) => (
          <motion.div
            key={i}
            className="flex-1 flex flex-col items-center gap-1.5"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reduce ? 0 : 0.25 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              title={day.rest && !day.active ? 'Dia de folga — não quebra a sequência' : undefined}
              className={`w-full aspect-square max-w-[44px] rounded-xl flex items-center justify-center transition-colors ${
                day.active
                  ? 'bg-amber-400 text-white'
                  : day.rest
                  ? 'bg-bg-secondary/60 text-text-soft border border-dashed border-border'
                  : 'bg-bg-secondary text-text-soft'
              } ${day.isToday ? 'ring-2 ring-primary-vibrant ring-offset-2' : ''}`}
            >
              {day.active ? <Flame size={16} /> : day.rest ? <Moon size={14} className="opacity-50" /> : ''}
            </div>
            <span className={`text-[11px] ${day.rest && !day.active ? 'text-text-soft' : 'text-text-secondary'}`}>
              {day.letter}
            </span>
          </motion.div>
        ))}
      </div>
    </>
  );
};

// Versão com Card (usada no Perfil).
export const StreakCard: React.FC = () => (
  <Card>
    <StreakContent />
  </Card>
);
