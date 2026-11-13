import React from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { useHoverCapable } from '@/hooks/useHoverCapable';

interface TiltCardProps {
  children: React.ReactNode;
  /** Inclinação máxima em graus. @default 6 */
  max?: number;
  className?: string;
}

/**
 * Inclina o conteúdo em 3D na direção do ponteiro.
 *
 * A posição do mouse vai para `MotionValue`s, que o framer aplica direto no
 * estilo do elemento — o componente NÃO renderiza de novo enquanto o mouse
 * anda. Sem hover (celular) ou com "reduzir movimento", vira uma <div> comum.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, max = 6, className = '' }) => {
  const hover = useHoverCapable();
  const calmo = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const mola = { stiffness: 260, damping: 22, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), mola);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), mola);

  if (!hover || calmo) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={e => {
        const caixa = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - caixa.left) / caixa.width - 0.5);
        py.set((e.clientY - caixa.top) / caixa.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
    </motion.div>
  );
};
