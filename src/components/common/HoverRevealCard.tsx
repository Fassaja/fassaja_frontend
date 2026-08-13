import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useHoverCapable } from '@/hooks/useHoverCapable';

interface HoverRevealCardProps {
  /** O card em si (fica por cima, opaco). */
  children: React.ReactNode;
  /** A síntese que sai de baixo do card. */
  summary: React.ReactNode;
  className?: string;
}

/**
 * Card com um painel de síntese que desliza de baixo dele.
 *
 * Duas adaptações em relação ao efeito original, que valem registro:
 *
 * 1. PONTEIRO GROSSO (celular/tablet) NÃO TEM HOVER. Um painel que só aparece
 *    no hover simplesmente não existiria no celular — e o Fassaja é instalável
 *    como app. Onde não há hover, a síntese fica sempre visível; a animação é
 *    um bônus de desktop, não o único caminho para a informação.
 *
 * 2. TECLADO. O reveal também responde a foco dentro do card, senão quem
 *    navega por Tab nunca alcança o conteúdo.
 *
 * A animação em si respeita "reduzir movimento" pelo MotionConfig do App.
 */
export const HoverRevealCard: React.FC<HoverRevealCardProps> = ({
  children,
  summary,
  className = '',
}) => {
  const hoverCapable = useHoverCapable();
  const [open, setOpen] = useState(false);

  // Sem hover disponível, a síntese nasce aberta e não anima.
  const revealed = !hoverCapable || open;

  return (
    <div
      className={`flex flex-col ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      // Capture: o foco acontece nos botões DENTRO do card, e o evento de
      // foco não borbulha — sem a fase de captura isto nunca dispararia.
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {/* z maior: o painel desliza POR TRÁS do card. */}
      <div className="relative z-10">{children}</div>

      <motion.div
        initial={false}
        animate={revealed ? 'shown' : 'hidden'}
        variants={{
          hidden: { opacity: 0, y: -28 },
          shown: { opacity: 1, y: 0 },
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="z-0 w-11/12 self-center"
        // Escondido de leitores de tela enquanto está recolhido no desktop:
        // o conteúdo repetiria o card sem que nada tenha sido acionado.
        aria-hidden={!revealed}
      >
        <div className="relative rounded-b-2xl border border-t-0 border-border bg-surface px-5 pt-5 pb-3">
          {summary}
        </div>
      </motion.div>
    </div>
  );
};
