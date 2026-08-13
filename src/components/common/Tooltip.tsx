import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useHoverCapable } from '@/hooks/useHoverCapable';

interface TooltipProps {
  /** Linha principal — curta, o rótulo da ação. */
  content: React.ReactNode;
  /** Segunda linha opcional: a explicação, quando houver regra a contar. */
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Atraso para abrir, em ms. @default 250 */
  delay?: number;
  /** Classe do invólucro que recebe o ponteiro. */
  className?: string;
}

const GAP = 8;
const MARGIN = 8;

/**
 * Dica flutuante para botões de ícone e explicações curtas.
 *
 * Substitui o `title=` do navegador, que tem três defeitos: demora cerca de um
 * segundo, ignora o tema (é sempre a caixinha do sistema) e não aparece no
 * foco por teclado.
 *
 * Três decisões que valem registro:
 *
 * 1. ENVOLVE em vez de clonar. O gatilho é um <span> próprio, e não o filho
 *    com `cloneElement`. Isso resolve dois problemas de uma vez: não depende
 *    do filho encaminhar `ref`, e funciona em botão DESABILITADO — um
 *    `<button disabled>` não dispara eventos de ponteiro, então o tooltip
 *    preso nele nunca abriria, justo onde ele mais importa ("por que não
 *    posso clicar?").
 *
 * 2. PORTAL para o body. Vários cards têm `overflow-hidden`; sem o portal a
 *    dica seria recortada pela borda do card.
 *
 * 3. INERTE onde não há hover. No celular a dica não existe — por isso nada
 *    essencial pode viver só aqui. Ela reforça o que o `aria-label` já diz.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  description,
  children,
  delay = 250,
  className = '',
}) => {
  const hoverCapable = useHoverCapable();
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Sai da tela com a abertura ainda agendada (navegar durante o atraso, um
  // card que some da lista): sem isto o timer dispara em um componente que já
  // não existe.
  useEffect(() => () => clearTimeout(timer.current), []);

  // Mede depois de montar a bolha: só então se sabe a largura real dela, que é
  // o que decide se cabe acima do gatilho e se precisa encostar na margem.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = wrapperRef.current?.getBoundingClientRect();
    const bubble = bubbleRef.current?.getBoundingClientRect();
    if (!trigger || !bubble) return;

    // Acima por padrão; abaixo quando não há espaço em cima.
    const acima = trigger.top - bubble.height - GAP;
    const top = acima < MARGIN ? trigger.bottom + GAP : acima;

    const ideal = trigger.left + trigger.width / 2 - bubble.width / 2;
    const left = Math.min(
      Math.max(MARGIN, ideal),
      window.innerWidth - bubble.width - MARGIN,
    );

    setPos({ top, left });
  }, [open, content, description]);

  if (!hoverCapable) return <>{children}</>;

  const abrir = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), delay);
  };

  // Fecha na hora: manter o atraso na saída deixa a dica "grudada" ao varrer
  // uma fileira de botões.
  const fechar = () => {
    clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={wrapperRef}
        className={`inline-flex ${className}`}
        onMouseEnter={abrir}
        onMouseLeave={fechar}
        // Captura: o foco acontece no botão de dentro e não borbulha.
        onFocusCapture={abrir}
        onBlurCapture={fechar}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={bubbleRef}
              id={id}
              role="tooltip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.14 }}
              style={{ top: pos.top, left: pos.left }}
              className="pointer-events-none fixed z-[100] max-w-xs rounded-lg border border-border bg-surface px-3 py-2 shadow-lg"
            >
              <p className="text-xs font-semibold leading-tight text-text-primary">{content}</p>
              {description && (
                <p className="mt-1 text-xs leading-snug text-text-secondary">{description}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
