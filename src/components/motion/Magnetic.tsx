import React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { useHoverCapable } from '@/hooks/useHoverCapable';

interface MagneticProps {
  children: React.ReactNode;
  /** Quanto do deslocamento do ponteiro o elemento acompanha (0–1). @default 0.3 */
  strength?: number;
  className?: string;
}

/**
 * O conteúdo é "puxado" pelo ponteiro quando ele passa por cima, e volta com
 * mola ao sair. Para uma ou duas chamadas principais por tela — num botão de
 * toda linha de lista vira enjoo.
 *
 * Mesma receita do TiltCard: MotionValues, nenhum render por movimento, e some
 * sem hover ou com "reduzir movimento".
 */
export const Magnetic: React.FC<MagneticProps> = ({ children, strength = 0.3, className = '' }) => {
  const hover = useHoverCapable();
  const calmo = useReducedMotion();
  const mola = { stiffness: 220, damping: 16, mass: 0.5 };
  const x = useSpring(useMotionValue(0), mola);
  const y = useSpring(useMotionValue(0), mola);

  if (!hover || calmo) return <span className={`inline-block ${className}`}>{children}</span>;

  return (
    <motion.span
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={e => {
        const caixa = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (caixa.left + caixa.width / 2)) * strength);
        y.set((e.clientY - (caixa.top + caixa.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
};
