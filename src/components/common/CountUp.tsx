import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

interface CountUpProps {
  value: number;
  /** Duração da contagem em ms (default casa com o preenchimento de anéis/barras). */
  durationMs?: number;
  /** Sufixo opcional colado ao número, ex.: '%'. */
  suffix?: string;
  className?: string;
}

/**
 * Anima um número do valor anterior até `value`, comunicando que o dado
 * "chegou" — pareado com o preenchimento das barras/anéis do dashboard.
 * Usa a mesma curva ease-out-expo dos progressos. Respeita prefers-reduced-motion
 * (mostra o valor final na hora). `tabular-nums` evita tremor de largura.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  durationMs = 900,
  suffix = '',
  className,
}) => {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setDisplay(Math.round(v)),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, durationMs, reduce]);

  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      {display.toLocaleString('pt-BR')}
      {suffix}
    </span>
  );
};
