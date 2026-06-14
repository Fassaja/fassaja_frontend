import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot, MascotState } from '@/components/mascot/Mascot';

type CelebrationVariant = 'task' | 'goal';

interface CelebrationContextValue {
  celebrate: (message?: string, variant?: CelebrationVariant) => void;
}

const CelebrationContext = createContext<CelebrationContextValue>({ celebrate: () => {} });

export const useCelebration = () => useContext(CelebrationContext);

const CONFETTI_COLORS = ['#2477FF', '#22C55E', '#FBBF24', '#8B5CF6', '#FB7185', '#2DD4BF'];

function makeConfetti(count: number, spread: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * spread,
    y: -60 - Math.random() * 140,
    rotate: Math.random() * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.14,
  }));
}

const TASK_CONFETTI = makeConfetti(14, 220);
const GOAL_CONFETTI = makeConfetti(26, 320);

const TASK_MESSAGES = [
  'Mandou bem! 🎉',
  'Tarefa concluída! 💪',
  'Você está voando! 🚀',
  'Mais uma feita! ✨',
];

interface ActiveCelebration {
  message: string;
  subtitle: string;
  variant: CelebrationVariant;
  mascot: MascotState;
}

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveCelebration | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const celebrate = useCallback((custom?: string, variant: CelebrationVariant = 'task') => {
    const isGoal = variant === 'goal';
    setActive({
      message: custom ?? TASK_MESSAGES[Math.floor(Math.random() * TASK_MESSAGES.length)],
      subtitle: isGoal ? 'Meta do dia concluída. Você arrasou!' : 'Continue assim!',
      variant,
      mascot: isGoal ? 'strong' : 'celebrate',
    });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(null), isGoal ? 3200 : 2200);
  }, []);

  const confetti = active?.variant === 'goal' ? GOAL_CONFETTI : TASK_CONFETTI;
  const isGoal = active?.variant === 'goal';

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}

      <AnimatePresence>
        {active && (
          <motion.div
            key="celebration"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-8 z-[80] flex justify-center pointer-events-none px-4"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0.6, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 20 }}
              className={`relative flex items-center gap-3 bg-white rounded-2xl shadow-xl pl-3 pr-5 py-3 ${
                isGoal
                  ? 'border-2 border-amber-300 ring-2 ring-amber-200/60'
                  : 'border border-border'
              }`}
            >
              {/* Confetti burst */}
              <div className="absolute left-1/2 top-1/2 w-0 h-0">
                {confetti.map(c => (
                  <motion.span
                    key={c.id}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rotate }}
                    transition={{ duration: isGoal ? 1.4 : 1.1, delay: c.delay, ease: 'easeOut' }}
                    className="absolute w-2 h-2 rounded-[2px]"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>

              <motion.div
                animate={isGoal ? { rotate: [0, -8, 8, -6, 0], scale: [1, 1.08, 1] } : { rotate: [0, -6, 6, -4, 0] }}
                transition={{ duration: 0.7, ease: 'easeInOut' }}
                className="shrink-0"
              >
                <Mascot state={active.mascot} size="xs" animate={false} />
              </motion.div>
              <div>
                <p className="font-bold text-text-primary leading-tight">{active.message}</p>
                <p className="text-xs text-text-secondary">{active.subtitle}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
};
