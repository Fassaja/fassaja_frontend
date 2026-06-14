import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from '@/components/mascot/Mascot';

interface CelebrationContextValue {
  celebrate: (message?: string) => void;
}

const CelebrationContext = createContext<CelebrationContextValue>({ celebrate: () => {} });

export const useCelebration = () => useContext(CelebrationContext);

const CONFETTI_COLORS = ['#2477FF', '#22C55E', '#FBBF24', '#8B5CF6', '#FB7185', '#2DD4BF'];
const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 220,
  y: -60 - Math.random() * 120,
  rotate: Math.random() * 360,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: Math.random() * 0.12,
}));

const MESSAGES = [
  'Mandou bem! 🎉',
  'Tarefa concluída! 💪',
  'Você está voando! 🚀',
  'Mais uma feita! ✨',
];

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const celebrate = useCallback((custom?: string) => {
    setMessage(custom ?? MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}

      <AnimatePresence>
        {message && (
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
              className="relative flex items-center gap-3 bg-white rounded-2xl border border-border shadow-lg pl-3 pr-5 py-3"
            >
              {/* Confetti burst */}
              <div className="absolute left-1/2 top-1/2 w-0 h-0">
                {CONFETTI.map(c => (
                  <motion.span
                    key={c.id}
                    initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: c.x, y: c.y, opacity: 0, rotate: c.rotate }}
                    transition={{ duration: 1.1, delay: c.delay, ease: 'easeOut' }}
                    className="absolute w-2 h-2 rounded-[2px]"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>

              <motion.div
                animate={{ rotate: [0, -6, 6, -4, 0] }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="shrink-0"
              >
                <Mascot state="celebrate" size="xs" animate={false} />
              </motion.div>
              <div>
                <p className="font-bold text-text-primary leading-tight">{message}</p>
                <p className="text-xs text-text-secondary">Continue assim!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
};
