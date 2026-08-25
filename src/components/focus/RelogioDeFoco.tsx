import React from 'react';
import NumberFlow from '@number-flow/react';

/**
 * O relógio da sessão, com os dígitos deslizando.
 *
 * Dois `NumberFlow` (minutos e segundos) em vez de um só: o valor que temos é
 * um total em segundos, e um número único não teria como virar `MM:SS`. Os
 * segundos vão com `minimumIntegerDigits: 2` para o "09" não virar "9" e a
 * largura do relógio não pular a cada dezena.
 *
 * `trend={-1}`: a contagem é REGRESSIVA. Sem isso a biblioteca deduz a direção
 * pela diferença, e na virada do minuto — de 00 para 59 — ela subiria, dando a
 * impressão de que o tempo voltou.
 *
 * A animação respeita `prefers-reduced-motion` por conta da própria
 * biblioteca: quem pediu menos movimento vê o número trocar sem deslizar.
 */
export const RelogioDeFoco: React.FC<{
  /** Segundos restantes. */
  segundos: number;
  className?: string;
}> = ({ segundos, className = '' }) => {
  const total = Math.max(0, Math.floor(segundos));
  const minutos = Math.floor(total / 60);
  const resto = total % 60;

  return (
    <span
      className={`tabular-nums ${className}`}
      // O relógio é lido em voz alta como um todo; os dois números separados
      // sairiam como "vinte e quatro" e "trinta e um", sem relação entre si.
      role="timer"
      aria-label={`${minutos} minutos e ${resto} segundos restantes`}
    >
      <span aria-hidden>
        <NumberFlow value={minutos} trend={-1} />
        <span className="mx-[0.02em]">:</span>
        <NumberFlow value={resto} trend={-1} format={{ minimumIntegerDigits: 2 }} />
      </span>
    </span>
  );
};
